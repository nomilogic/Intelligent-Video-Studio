import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sessionsTable = pgTable(
  "sessions",
  {
    // Opaque random token id (no autoincrement so the cookie value is not
    // guessable). Hashed before lookup in code.
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
    expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
  }),
);

export type Session = typeof sessionsTable.$inferSelect;
