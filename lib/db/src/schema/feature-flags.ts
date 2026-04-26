import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const featureFlagsTable = pgTable(
  "feature_flags",
  {
    id: serial("id").primaryKey(),
    // Unique key referenced by middleware: "export_hd", "ai_instruction",
    // "auto_subtitles", "chroma_key", "lut", etc.
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    // Globally enabled?
    enabled: boolean("enabled").notNull().default(true),
    // Does invoking this feature require diamonds?
    requiresDiamonds: boolean("requires_diamonds").notNull().default(false),
    // Cost per invocation when requiresDiamonds is true.
    costDiamonds: integer("cost_diamonds").notNull().default(0),
    // Does using this feature require being signed in?
    requiresAuth: boolean("requires_auth").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyIdx: uniqueIndex("feature_flags_key_idx").on(t.key),
  }),
);

export const platformSettingsTable = pgTable("platform_settings", {
  // Single-row settings table keyed by string. Stored as JSON text so admins
  // can edit any value (welcome grant, daily grant, referral bonus, etc.).
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type PlatformSetting = typeof platformSettingsTable.$inferSelect;
