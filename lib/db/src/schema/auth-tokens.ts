import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const emailVerificationTokensTable = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenHashIdx: index("evt_token_hash_idx").on(t.tokenHash),
    userIdx: index("evt_user_idx").on(t.userId),
  }),
);

export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenHashIdx: index("prt_token_hash_idx").on(t.tokenHash),
    userIdx: index("prt_user_idx").on(t.userId),
  }),
);

export const oauthStatesTable = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  // For login: provider="google", redirect="/projects" etc.
  // For cloud connection: provider="google_drive"|"dropbox"|"onedrive", userId set.
  intent: text("intent").notNull(),
  provider: text("provider").notNull(),
  userId: integer("user_id"),
  redirect: text("redirect"),
  codeVerifier: text("code_verifier"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmailVerificationToken =
  typeof emailVerificationTokensTable.$inferSelect;
export type PasswordResetToken =
  typeof passwordResetTokensTable.$inferSelect;
export type OauthState = typeof oauthStatesTable.$inferSelect;
