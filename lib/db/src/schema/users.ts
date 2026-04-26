import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    emailLower: text("email_lower").notNull(),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    emailVerified: boolean("email_verified").notNull().default(false),
    role: text("role").notNull().default("user"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    referralCode: text("referral_code").notNull(),
    referredBy: integer("referred_by"),
    banned: boolean("banned").notNull().default(false),
    bannedReason: text("banned_reason"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailLowerIdx: uniqueIndex("users_email_lower_idx").on(t.emailLower),
    googleSubIdx: uniqueIndex("users_google_sub_idx").on(t.googleSub),
    referralCodeIdx: uniqueIndex("users_referral_code_idx").on(t.referralCode),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
