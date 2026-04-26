import { Router, raw } from "express";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod/v4";
import {
  db,
  diamondPackagesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  applyLedger,
  claimDaily,
  getBalance,
  listTransactions,
  StripeEventAlreadyProcessedError,
  todayUtc,
} from "../lib/diamonds";
import {
  DEFAULT_SETTINGS,
  getNumberSetting,
  SETTING_KEYS,
} from "../lib/feature-flags";
import { dailyClaimsTable, diamondTransactionsTable } from "@workspace/db";
import { and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

let _stripe: Stripe | null = null;
function stripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  _stripe ??= new Stripe(key, { apiVersion: "2025-09-30.clover" as any });
  return _stripe;
}

router.get("/diamonds/me", requireAuth, async (req, res) => {
  const balance = await getBalance(req.user!.id);
  // Daily claim status
  const today = todayUtc();
  const [claim] = await db
    .select()
    .from(dailyClaimsTable)
    .where(
      and(
        eq(dailyClaimsTable.userId, req.user!.id),
        eq(dailyClaimsTable.claimDate, today),
      ),
    );
  const dailyAmount = await getNumberSetting(
    SETTING_KEYS.DAILY_GRANT,
    DEFAULT_SETTINGS[SETTING_KEYS.DAILY_GRANT],
  );
  const referralBonus = await getNumberSetting(
    SETTING_KEYS.REFERRAL_BONUS,
    DEFAULT_SETTINGS[SETTING_KEYS.REFERRAL_BONUS],
  );
  res.json({
    balance,
    dailyClaim: {
      claimedToday: !!claim,
      amount: dailyAmount,
      claimDate: today,
    },
    referral: {
      code: req.user!.referralCode,
      bonus: referralBonus,
    },
  });
});

router.get("/diamonds/transactions", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const txs = await listTransactions(req.user!.id, limit);
  res.json({
    transactions: txs.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

router.post("/diamonds/claim-daily", requireAuth, async (req, res) => {
  const amount = await getNumberSetting(
    SETTING_KEYS.DAILY_GRANT,
    DEFAULT_SETTINGS[SETTING_KEYS.DAILY_GRANT],
  );
  if (amount <= 0) {
    res.status(400).json({ error: "Daily grant is disabled" });
    return;
  }
  const result = await claimDaily(req.user!.id, amount);
  if (!result) {
    res.status(409).json({ error: "Already claimed today", date: todayUtc() });
    return;
  }
  res.json({ balance: result.balance, granted: amount });
});

router.get("/diamonds/packages", async (_req, res) => {
  const rows = await db
    .select()
    .from(diamondPackagesTable)
    .where(eq(diamondPackagesTable.active, true))
    .orderBy(diamondPackagesTable.sortOrder);
  res.json({
    packages: rows.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    stripeEnabled: !!process.env["STRIPE_SECRET_KEY"],
    publishableKey: process.env["STRIPE_PUBLISHABLE_KEY"] ?? null,
  });
});

const CheckoutBody = z.object({ packageId: z.number().int().positive() });

router.post("/diamonds/checkout", requireAuth, async (req, res) => {
  const s = stripe();
  if (!s) {
    res.status(503).json({
      error:
        "Stripe is not configured on this server. Set STRIPE_SECRET_KEY to enable purchases.",
    });
    return;
  }
  const body = CheckoutBody.parse(req.body);
  const [pkg] = await db
    .select()
    .from(diamondPackagesTable)
    .where(eq(diamondPackagesTable.id, body.packageId));
  if (!pkg || !pkg.active) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  const baseUrl =
    process.env["PUBLIC_BASE_URL"] ??
    (process.env["REPLIT_DEV_DOMAIN"] ? `https://${process.env["REPLIT_DEV_DOMAIN"]}` : "http://localhost:5000");
  const session = await s.checkout.sessions.create({
    mode: "payment",
    success_url: `${baseUrl}/diamonds?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/diamonds?canceled=1`,
    customer_email: req.user!.email,
    client_reference_id: String(req.user!.id),
    metadata: {
      userId: String(req.user!.id),
      packageId: String(pkg.id),
      diamonds: String(pkg.diamonds + pkg.bonusDiamonds),
    },
    line_items: [
      {
        price_data: {
          currency: pkg.currency,
          product_data: {
            name: `${pkg.diamonds + pkg.bonusDiamonds} Diamonds — ${pkg.name}`,
            description: pkg.description ?? undefined,
          },
          unit_amount: pkg.priceCents,
        },
        quantity: 1,
      },
    ],
  });
  res.json({ url: session.url, id: session.id });
});

// IMPORTANT: Stripe webhooks need the raw body for signature verification.
// We mount this route with `express.raw` BEFORE the JSON body parser is
// applied (see app.ts).
router.post(
  "/diamonds/webhook",
  raw({ type: "application/json" }),
  async (req, res) => {
    const s = stripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!s || !sig || !webhookSecret) {
      res.status(503).json({ error: "Stripe webhook not configured" });
      return;
    }
    let event: Stripe.Event;
    try {
      event = s.webhooks.constructEvent(req.body as any, sig as string, webhookSecret);
    } catch (err: any) {
      logger.warn({ err }, "stripe webhook signature failed");
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = Number(session.client_reference_id);
        const packageId = Number(session.metadata?.["packageId"]);
        if (!userId || !packageId) {
          logger.warn({ event: event.id }, "stripe webhook missing ids");
          res.json({ received: true });
          return;
        }
        const [pkg] = await db
          .select()
          .from(diamondPackagesTable)
          .where(eq(diamondPackagesTable.id, packageId));
        if (!pkg) {
          logger.warn({ event: event.id, packageId }, "package missing");
          res.json({ received: true });
          return;
        }
        const total = pkg.diamonds + pkg.bonusDiamonds;
        try {
          await applyLedger({
            userId,
            amount: total,
            kind: "purchase",
            reason: `Purchased ${pkg.name} (${total} diamonds)`,
            stripeEventId: event.id,
            stripeSessionId: session.id,
            metadata: { packageId },
          });
        } catch (err) {
          if (err instanceof StripeEventAlreadyProcessedError) {
            logger.info({ event: event.id }, "stripe event already processed");
          } else {
            throw err;
          }
        }
      }
      // Refund handler (charge.refunded)
      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const sessionId = (charge.metadata?.["sessionId"] as string) ?? null;
        const userId = Number(charge.metadata?.["userId"] ?? 0);
        if (userId && sessionId) {
          // Find original purchase tx for this session
          const [orig] = await db
            .select()
            .from(diamondTransactionsTable)
            .where(eq(diamondTransactionsTable.stripeSessionId, sessionId));
          if (orig) {
            try {
              await applyLedger({
                userId,
                amount: -orig.amount,
                kind: "refund",
                reason: `Refund of transaction #${orig.id}`,
                stripeEventId: event.id,
                refundedTransactionId: orig.id,
              });
            } catch (err) {
              if (!(err instanceof StripeEventAlreadyProcessedError)) throw err;
            }
          }
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "stripe webhook handler failed");
      res.status(500).json({ error: err?.message ?? "Webhook failed" });
    }
  },
);

export default router;
