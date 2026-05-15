import { Router } from "express";
import { db, sharedTemplatesTable, usersTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

// ─────── Public: browse approved templates ───────

router.get("/shared-templates", async (req, res) => {
  try {
    const featured = req.query.featured === "true";
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(60, Math.max(1, parseInt(String(req.query.limit ?? "24"), 10)));
    const offset = (page - 1) * limit;

    const where = featured
      ? and(eq(sharedTemplatesTable.approved, true), eq(sharedTemplatesTable.featured, true))
      : eq(sharedTemplatesTable.approved, true);

    const [templates, [countRow]] = await Promise.all([
      db
        .select({
          id: sharedTemplatesTable.id,
          name: sharedTemplatesTable.name,
          description: sharedTemplatesTable.description,
          emoji: sharedTemplatesTable.emoji,
          canvasWidth: sharedTemplatesTable.canvasWidth,
          canvasHeight: sharedTemplatesTable.canvasHeight,
          duration: sharedTemplatesTable.duration,
          background: sharedTemplatesTable.background,
          featured: sharedTemplatesTable.featured,
          downloads: sharedTemplatesTable.downloads,
          createdAt: sharedTemplatesTable.createdAt,
          authorName: usersTable.name,
        })
        .from(sharedTemplatesTable)
        .leftJoin(usersTable, eq(usersTable.id, sharedTemplatesTable.authorId))
        .where(where)
        .orderBy(desc(sharedTemplatesTable.featured), desc(sharedTemplatesTable.downloads), desc(sharedTemplatesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(sharedTemplatesTable).where(where),
    ]);

    res.json({ templates, total: countRow?.count ?? 0, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// ─────── Public: apply a template (increment downloads) ───────

router.post("/shared-templates/:id/apply", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [tpl] = await db
      .select()
      .from(sharedTemplatesTable)
      .where(and(eq(sharedTemplatesTable.id, id), eq(sharedTemplatesTable.approved, true)));

    if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }

    await db
      .update(sharedTemplatesTable)
      .set({ downloads: tpl.downloads + 1 })
      .where(eq(sharedTemplatesTable.id, id));

    const { stateJson, ...meta } = tpl;
    res.json({ ...meta, stateJson });
  } catch {
    res.status(500).json({ error: "Failed to apply template" });
  }
});

// ─────── Authenticated: share a template ───────

const shareSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional().default(""),
  emoji: z.string().max(4).optional().default("🎬"),
  stateJson: z.string().min(2),
  canvasWidth: z.number().int().positive().optional().default(1080),
  canvasHeight: z.number().int().positive().optional().default(1920),
  duration: z.number().int().positive().optional().default(10),
  background: z.string().optional().default("#000000"),
});

router.post("/shared-templates", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const result = shareSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: "Invalid body" }); return; }

  try {
    const [row] = await db
      .insert(sharedTemplatesTable)
      .values({
        authorId: user.id,
        name: result.data.name,
        description: result.data.description ?? "",
        emoji: result.data.emoji ?? "🎬",
        stateJson: result.data.stateJson,
        canvasWidth: result.data.canvasWidth ?? 1080,
        canvasHeight: result.data.canvasHeight ?? 1920,
        duration: result.data.duration ?? 10,
        background: result.data.background ?? "#000000",
        approved: false,
        featured: false,
      })
      .returning();

    res.status(201).json({ id: row.id, message: "Template submitted for review." });
  } catch {
    res.status(500).json({ error: "Failed to share template" });
  }
});

// ─────── Admin: list all shared templates ───────

router.get("/admin/shared-templates", requireAdmin, async (_req, res) => {
  try {
    const templates = await db
      .select({
        id: sharedTemplatesTable.id,
        name: sharedTemplatesTable.name,
        description: sharedTemplatesTable.description,
        emoji: sharedTemplatesTable.emoji,
        authorId: sharedTemplatesTable.authorId,
        authorEmail: usersTable.email,
        featured: sharedTemplatesTable.featured,
        approved: sharedTemplatesTable.approved,
        downloads: sharedTemplatesTable.downloads,
        createdAt: sharedTemplatesTable.createdAt,
      })
      .from(sharedTemplatesTable)
      .leftJoin(usersTable, eq(usersTable.id, sharedTemplatesTable.authorId))
      .orderBy(desc(sharedTemplatesTable.createdAt))
      .limit(200);

    res.json({ templates });
  } catch {
    res.status(500).json({ error: "Failed to fetch shared templates" });
  }
});

// ─────── Admin: approve/reject ───────

router.patch("/admin/shared-templates/:id/approve", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const approved = Boolean(req.body?.approved);
  await db.update(sharedTemplatesTable).set({ approved }).where(eq(sharedTemplatesTable.id, id));
  res.json({ ok: true });
});

// ─────── Admin: feature/unfeature ───────

router.patch("/admin/shared-templates/:id/feature", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const featured = Boolean(req.body?.featured);
  await db.update(sharedTemplatesTable).set({ featured }).where(eq(sharedTemplatesTable.id, id));
  res.json({ ok: true });
});

// ─────── Admin: delete ───────

router.delete("/admin/shared-templates/:id", requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(sharedTemplatesTable).where(eq(sharedTemplatesTable.id, id));
  res.json({ ok: true });
});

export default router;
