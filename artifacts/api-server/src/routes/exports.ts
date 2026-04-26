import { Router } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/auth";
import { getFlag } from "../lib/feature-flags";
import {
  applyLedger,
  getBalance,
  InsufficientDiamondsError,
} from "../lib/diamonds";

const router = Router();

const PreflightBody = z.object({
  width: z.number().int().min(1).max(7680),
  height: z.number().int().min(1).max(7680),
  format: z.enum(["mp4", "webm", "gif", "audio"]),
  fps: z.number().int().min(1).max(120).optional(),
  projectId: z.number().int().positive().optional(),
});

/**
 * Server-authoritative export gate. The client must call this BEFORE
 * starting any local encoding so the diamond economy is enforced on
 * every export, not only on cloud uploads. The server picks the
 * feature key (`export_hd` for >720p output, `export` otherwise) so a
 * client cannot under-report its resolution to dodge the HD charge.
 *
 * On 200 the user has been charged (if the flag requires diamonds) and
 * the client may proceed with local encoding. The response includes
 * the new balance so the diamond pill updates immediately.
 */
router.post("/exports/preflight", requireAuth, async (req, res) => {
  const body = PreflightBody.parse(req.body);
  const isHd = body.height > 720;
  const featureKey = isHd ? "export_hd" : "export";
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
  if (!flag.requiresDiamonds || flag.costDiamonds <= 0) {
    const balance = await getBalance(req.user!.id);
    res.json({ ok: true, charged: 0, balance, featureKey });
    return;
  }
  try {
    const tx = await applyLedger({
      userId: req.user!.id,
      amount: -flag.costDiamonds,
      kind: "spend",
      featureKey,
      reason: `Export at ${body.width}x${body.height}`,
    });
    res.setHeader("X-Diamond-Spent", String(flag.costDiamonds));
    res.setHeader("X-Diamond-Balance", String(tx.balanceAfter));
    res.json({
      ok: true,
      charged: flag.costDiamonds,
      balance: tx.balanceAfter,
      featureKey,
      transactionId: tx.id,
    });
  } catch (err) {
    if (err instanceof InsufficientDiamondsError) {
      const balance = await getBalance(req.user!.id);
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
});

const RefundBody = z.object({
  transactionId: z.number().int().positive(),
  reason: z.string().min(1).max(200).optional(),
});

/**
 * Client-side encoding failed after a successful preflight. Refunds the
 * exact spend referenced by `transactionId` if and only if the
 * referenced transaction belongs to the current user, was a `spend`
 * for an export feature, and has not already been refunded.
 */
router.post("/exports/refund", requireAuth, async (req, res) => {
  const body = RefundBody.parse(req.body);
  const { db, diamondTransactionsTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");
  const [orig] = await db
    .select()
    .from(diamondTransactionsTable)
    .where(
      and(
        eq(diamondTransactionsTable.id, body.transactionId),
        eq(diamondTransactionsTable.userId, req.user!.id),
      ),
    );
  if (!orig || orig.kind !== "spend") {
    res.status(404).json({ error: "Spend not found" });
    return;
  }
  if (orig.featureKey !== "export" && orig.featureKey !== "export_hd") {
    res.status(400).json({ error: "Not an export charge" });
    return;
  }
  // Already refunded?
  const [existing] = await db
    .select({ id: diamondTransactionsTable.id })
    .from(diamondTransactionsTable)
    .where(
      and(
        eq(diamondTransactionsTable.userId, req.user!.id),
        eq(diamondTransactionsTable.refundedTransactionId, orig.id),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "Already refunded" });
    return;
  }
  const tx = await applyLedger({
    userId: req.user!.id,
    amount: -orig.amount, // orig.amount is negative; -negative = positive credit
    kind: "refund",
    featureKey: orig.featureKey,
    reason: body.reason ?? "Export failed",
    refundedTransactionId: orig.id,
  });
  res.json({ ok: true, balance: tx.balanceAfter, transactionId: tx.id });
});

export default router;
