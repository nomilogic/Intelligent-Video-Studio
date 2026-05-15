import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const sharedTemplatesTable = pgTable(
  "shared_templates",
  {
    id: serial("id").primaryKey(),
    authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    emoji: text("emoji").notNull().default("🎬"),
    canvasWidth: integer("canvas_width").notNull().default(1080),
    canvasHeight: integer("canvas_height").notNull().default(1920),
    duration: integer("duration").notNull().default(10),
    background: text("background").notNull().default("#000000"),
    /** Full serialized EditorState snapshot (clips, keyframes, tracks, etc.) */
    stateJson: text("state_json").notNull(),
    approved: boolean("approved").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    authorIdx: index("shared_templates_author_idx").on(t.authorId),
    approvedIdx: index("shared_templates_approved_idx").on(t.approved),
    featuredIdx: index("shared_templates_featured_idx").on(t.featured),
  }),
);

export const insertSharedTemplateSchema = createInsertSchema(sharedTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloads: true,
});

export type SharedTemplate = typeof sharedTemplatesTable.$inferSelect;
export type NewSharedTemplate = z.infer<typeof insertSharedTemplateSchema>;
