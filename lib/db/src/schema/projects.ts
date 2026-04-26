import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectsTable = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    // Nullable for back-compat with projects created before user accounts.
    // New projects always associate to the signed-in user.
    userId: integer("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    state: text("state").notNull().default("{}"),
    duration: real("duration").notNull().default(0),
    canvasWidth: integer("canvas_width").notNull().default(1920),
    canvasHeight: integer("canvas_height").notNull().default(1080),
    // Data URL or hosted URL of a tiny JPEG snapshot of the first frame.
    thumbnail: text("thumbnail"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("projects_user_idx").on(t.userId),
    updatedIdx: index("projects_updated_idx").on(t.updatedAt),
  }),
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
