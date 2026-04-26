import { eq, and, sql } from "drizzle-orm";
import {
  db,
  diamondBalancesTable,
  diamondTransactionsTable,
  dailyClaimsTable,
} from "@workspace/db";
import type { DiamondTransaction } from "@workspace/db";

export type LedgerKind =
  | "welcome"
  | "daily"
  | "referral"
  | "referral_bonus"
  | "purchase"
  | "spend"
  | "refund"
  | "admin_grant"
  | "admin_revoke";

export interface LedgerOpts {
  userId: number;
  amount: number; // positive for credit, negative for debit
  kind: LedgerKind;
  featureKey?: string;
  reason?: string;
  stripeEventId?: string;
  stripeSessionId?: string;
  refundedTransactionId?: number;
  metadata?: Record<string, unknown>;
}

export class InsufficientDiamondsError extends Error {
  constructor(
    public required: number,
    public balance: number,
  ) {
    super(`Insufficient diamonds: need ${required}, have ${balance}`);
  }
}

export class StripeEventAlreadyProcessedError extends Error {
  constructor(public stripeEventId: string) {
    super(`Stripe event ${stripeEventId} already processed`);
  }
}

/**
 * Atomically apply a ledger transaction. The caller is responsible for
 * validating business rules (daily-claim window, referral eligibility, etc).
 *
 * - Updates `diamond_balances.balance` and inserts a `diamond_transactions`
 *   row inside one DB transaction.
 * - For `spend` (negative amount), throws `InsufficientDiamondsError` if the
 *   balance would go negative.
 * - For `purchase`/`refund` with a `stripeEventId`, the unique index on
 *   `stripe_event_id` makes the operation idempotent — repeated calls with
 *   the same id throw `StripeEventAlreadyProcessedError`.
 */
export async function applyLedger(
  opts: LedgerOpts,
): Promise<DiamondTransaction> {
  return db.transaction(async (tx: any) => {
    if (opts.stripeEventId) {
      const [existing] = await tx
        .select({ id: diamondTransactionsTable.id })
        .from(diamondTransactionsTable)
        .where(eq(diamondTransactionsTable.stripeEventId, opts.stripeEventId));
      if (existing) {
        throw new StripeEventAlreadyProcessedError(opts.stripeEventId);
      }
    }

    // Ensure a balance row exists (idempotent insert).
    await tx
      .insert(diamondBalancesTable)
      .values({ userId: opts.userId, balance: 0 })
      .onConflictDoNothing({ target: diamondBalancesTable.userId });

    const [bal] = await tx
      .select()
      .from(diamondBalancesTable)
      .where(eq(diamondBalancesTable.userId, opts.userId))
      .for("update");

    const current = bal?.balance ?? 0;
    const next = current + opts.amount;
    if (next < 0) {
      throw new InsufficientDiamondsError(-opts.amount, current);
    }

    await tx
      .update(diamondBalancesTable)
      .set({ balance: next, updatedAt: new Date() })
      .where(eq(diamondBalancesTable.userId, opts.userId));

    const [txRow] = await tx
      .insert(diamondTransactionsTable)
      .values({
        userId: opts.userId,
        amount: opts.amount,
        kind: opts.kind,
        featureKey: opts.featureKey ?? null,
        reason: opts.reason ?? null,
        balanceAfter: next,
        stripeEventId: opts.stripeEventId ?? null,
        stripeSessionId: opts.stripeSessionId ?? null,
        refundedTransactionId: opts.refundedTransactionId ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      })
      .returning();

    return txRow!;
  });
}

export async function getBalance(userId: number): Promise<number> {
  const [bal] = await db
    .select()
    .from(diamondBalancesTable)
    .where(eq(diamondBalancesTable.userId, userId));
  return bal?.balance ?? 0;
}

export async function listTransactions(
  userId: number,
  limit = 50,
): Promise<DiamondTransaction[]> {
  return db
    .select()
    .from(diamondTransactionsTable)
    .where(eq(diamondTransactionsTable.userId, userId))
    .orderBy(sql`${diamondTransactionsTable.id} DESC`)
    .limit(limit);
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Try to claim a daily grant. Returns the new balance if successful, or
 * `null` if the user already claimed today.
 */
export async function claimDaily(
  userId: number,
  amount: number,
): Promise<{ balance: number; transaction: DiamondTransaction } | null> {
  const date = todayUtc();
  return db.transaction(async (tx: any) => {
    try {
      await tx.insert(dailyClaimsTable).values({ userId, claimDate: date, amount });
    } catch {
      return null;
    }
    // Use applyLedger logic inline so the daily claim insert and ledger
    // entry share the same transaction, ensuring atomicity.
    await tx
      .insert(diamondBalancesTable)
      .values({ userId, balance: 0 })
      .onConflictDoNothing({ target: diamondBalancesTable.userId });
    const [bal] = await tx
      .select()
      .from(diamondBalancesTable)
      .where(eq(diamondBalancesTable.userId, userId))
      .for("update");
    const next = (bal?.balance ?? 0) + amount;
    await tx
      .update(diamondBalancesTable)
      .set({ balance: next, updatedAt: new Date() })
      .where(eq(diamondBalancesTable.userId, userId));
    const [txRow] = await tx
      .insert(diamondTransactionsTable)
      .values({
        userId,
        amount,
        kind: "daily",
        reason: `Daily login grant (${date})`,
        balanceAfter: next,
      })
      .returning();
    return { balance: next, transaction: txRow! };
  });
}
