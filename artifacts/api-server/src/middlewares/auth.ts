import type { Request, Response, NextFunction } from "express";
import {
  SESSION_COOKIE,
  findSessionUser,
  revokeSession,
} from "../lib/auth";
import type { User } from "@workspace/db";
import { getFlag } from "../lib/feature-flags";
import {
  applyLedger,
  getBalance,
  InsufficientDiamondsError,
} from "../lib/diamonds";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function readToken(req: Request): string | null {
  const c = (req as any).cookies?.[SESSION_COOKIE];
  if (typeof c === "string" && c.length > 0) return c;
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

/**
 * Attach `req.user` if a valid session cookie is present. Never throws;
 * unauthenticated requests proceed normally.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readToken(req);
  if (token) {
    try {
      const user = await findSessionUser(token);
      if (user && !user.banned) req.user = user;
    } catch (err) {
      req.log?.warn({ err }, "session lookup failed");
    }
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/**
 * Spend the configured cost of `featureKey` from the signed-in user's
 * diamond balance before invoking the route handler. If the feature is
 * disabled or the user can't afford it, returns 402 / 403.
 *
 * **Auto-refund on failure.** We hook `res.on("close")` so that whenever
 * the response finishes with a 4xx/5xx status code (or the connection
 * is closed before the handler ever sent a response), the spend is
 * automatically refunded via a compensating ledger entry. This means a
 * downstream provider failure (Gemini outage, cloud upload error, etc.)
 * never silently consumes the user's diamonds.
 */
export function requireDiamonds(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const flag = await getFlag(featureKey);
      if (!flag) {
        res.status(404).json({ error: `Unknown feature: ${featureKey}` });
        return;
      }
      if (!flag.enabled) {
        res.status(403).json({
          error: `Feature ${flag.label} is disabled`,
          featureKey,
        });
        return;
      }
      if (flag.requiresAuth && !req.user) {
        res.status(401).json({ error: "Sign in to use this feature" });
        return;
      }
      if (flag.requiresDiamonds && flag.costDiamonds > 0) {
        if (!req.user) {
          res.status(401).json({ error: "Sign in to use this feature" });
          return;
        }
        try {
          const tx = await applyLedger({
            userId: req.user.id,
            amount: -flag.costDiamonds,
            kind: "spend",
            featureKey,
            reason: `Used ${flag.label}`,
          });
          res.setHeader("X-Diamond-Spent", String(flag.costDiamonds));
          res.setHeader("X-Diamond-Balance", String(tx.balanceAfter));

          // Compensating refund on handler failure / non-2xx response.
          const userId = req.user.id;
          const cost = flag.costDiamonds;
          const label = flag.label;
          const spentTxId = tx.id;
          let refunded = false;
          const maybeRefund = async () => {
            if (refunded) return;
            // Only refund on error responses (4xx/5xx) or aborted requests.
            // 2xx/3xx means the handler succeeded — keep the spend.
            const status = res.statusCode;
            if (status >= 200 && status < 400 && res.writableEnded) return;
            refunded = true;
            try {
              await applyLedger({
                userId,
                amount: cost,
                kind: "refund",
                featureKey,
                reason: `Auto-refund for failed ${label} (status ${status})`,
                refundedTransactionId: spentTxId,
              });
            } catch (err) {
              req.log?.error(
                { err, userId, featureKey, spentTxId },
                "auto-refund failed",
              );
            }
          };
          res.on("close", () => {
            void maybeRefund();
          });
        } catch (err) {
          if (err instanceof InsufficientDiamondsError) {
            const balance = await getBalance(req.user.id);
            res.status(402).json({
              error: "Insufficient diamonds",
              required: err.required,
              balance,
              featureKey,
              featureLabel: flag.label,
            });
            return;
          }
          throw err;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
