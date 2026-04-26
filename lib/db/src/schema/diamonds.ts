import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diamondBalancesTable = pgTable("diamond_balances", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // Denormalized cache of sum(amount) from transactions.
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const diamondTransactionsTable = pgTable(
  "diamond_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Positive for grants/purchases/refunds, negative for spends.
    amount: integer("amount").notNull(),
    // welcome | daily | referral | referral_bonus | purchase | spend | refund | admin_grant | admin_revoke
    kind: text("kind").notNull(),
    // Featurelogical key for spends (e.g. "export", "ai_instruction"). Optional.
    featureKey: text("feature_key"),
    reason: text("reason"),
    // Balance after this transaction is applied. Mirror of `diamond_balances.balance`.
    balanceAfter: integer("balance_after").notNull(),
    // Stripe linkage (for purchase/refund kinds).
    stripeEventId: text("stripe_event_id"),
    stripeSessionId: text("stripe_session_id"),
    // For refund: id of the original purchase transaction.
    refundedTransactionId: integer("refunded_transaction_id"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("diamond_tx_user_idx").on(t.userId),
    kindIdx: index("diamond_tx_kind_idx").on(t.kind),
    stripeEventIdx: uniqueIndex("diamond_tx_stripe_event_idx").on(
      t.stripeEventId,
    ),
    createdIdx: index("diamond_tx_created_idx").on(t.createdAt),
  }),
);

export const diamondPackagesTable = pgTable(
  "diamond_packages",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    diamonds: integer("diamonds").notNull(),
    bonusDiamonds: integer("bonus_diamonds").notNull().default(0),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    badge: text("badge"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sortIdx: index("diamond_pkg_sort_idx").on(t.sortOrder),
  }),
);

export const dailyClaimsTable = pgTable(
  "diamond_daily_claims",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // ISO date string (YYYY-MM-DD) in UTC for atomic per-day uniqueness.
    claimDate: text("claim_date").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqClaim: uniqueIndex("daily_claims_user_date_idx").on(
      t.userId,
      t.claimDate,
    ),
  }),
);

export const insertDiamondPackageSchema = createInsertSchema(
  diamondPackagesTable,
).omit({ id: true, createdAt: true });

export type DiamondBalance = typeof diamondBalancesTable.$inferSelect;
export type DiamondTransaction = typeof diamondTransactionsTable.$inferSelect;
export type DiamondPackage = typeof diamondPackagesTable.$inferSelect;
export type InsertDiamondPackage = z.infer<typeof insertDiamondPackageSchema>;
export type DailyClaim = typeof dailyClaimsTable.$inferSelect;
