import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminAuditLogTable = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdIdx: index("admin_audit_created_idx").on(t.createdAt),
    actorIdx: index("admin_audit_actor_idx").on(t.actorId),
  }),
);

export type AdminAuditEntry = typeof adminAuditLogTable.$inferSelect;
