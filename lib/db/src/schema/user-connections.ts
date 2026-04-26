import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userConnectionsTable = pgTable(
  "user_connections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // "google_drive" | "dropbox" | "onedrive" | "terabox"
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    accountEmail: text("account_email"),
    accountName: text("account_name"),
    // AES-GCM encrypted token blobs (base64).
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqProvider: uniqueIndex("user_connections_user_provider_idx").on(
      t.userId,
      t.provider,
    ),
  }),
);

export type UserConnection = typeof userConnectionsTable.$inferSelect;
