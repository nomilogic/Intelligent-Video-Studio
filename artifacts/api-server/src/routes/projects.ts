import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const CreateProjectBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  canvasWidth: z.number().int().min(64).max(7680).optional(),
  canvasHeight: z.number().int().min(64).max(7680).optional(),
  state: z.string().optional(),
  duration: z.number().min(0).optional(),
});

const UpdateProjectBody = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  canvasWidth: z.number().int().min(64).max(7680).optional(),
  canvasHeight: z.number().int().min(64).max(7680).optional(),
  state: z.string().optional(),
  duration: z.number().min(0).optional(),
  thumbnail: z.string().nullable().optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function serialize(p: any) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

router.get("/projects", requireAuth, async (req, res) => {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.user!.id))
    .orderBy(desc(projectsTable.updatedAt));
  res.json(projects.map((p) => ({ ...serialize(p), state: undefined })));
});

router.post("/projects", requireAuth, async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const [project] = await db
    .insert(projectsTable)
    .values({
      userId: req.user!.id,
      name: body.name,
      description: body.description ?? null,
      canvasWidth: body.canvasWidth ?? 1920,
      canvasHeight: body.canvasHeight ?? 1080,
      state:
        body.state ??
        JSON.stringify({
          clips: [],
          transitions: [],
          canvasWidth: body.canvasWidth ?? 1920,
          canvasHeight: body.canvasHeight ?? 1080,
          duration: body.duration ?? 0,
        }),
      duration: body.duration ?? 0,
    })
    .returning();
  res.status(201).json(serialize(project));
});

// Strict owner-only project access. Anonymous editing happens entirely
// in localStorage on the client (see EditorPage), so the API never needs
// to expose null-owned rows. Legacy `userId IS NULL` rows from previous
// single-tenant seeds are treated as inaccessible — admins can adopt or
// purge them via the admin panel.
router.get("/projects/:id", requireAuth, async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  if (!project || project.userId !== req.user!.id) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(serialize(project));
});

router.put("/projects/:id", requireAuth, async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const body = UpdateProjectBody.parse(req.body);
  const [existing] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, id))
    .returning();
  res.json(serialize(project));
});

router.delete("/projects/:id", requireAuth, async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const [existing] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

router.post("/projects/:id/duplicate", requireAuth, async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const [src] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  if (!src || src.userId !== req.user!.id) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [copy] = await db
    .insert(projectsTable)
    .values({
      userId: req.user!.id,
      name: `${src.name} (copy)`,
      description: src.description,
      state: src.state,
      duration: src.duration,
      canvasWidth: src.canvasWidth,
      canvasHeight: src.canvasHeight,
      thumbnail: src.thumbnail,
    })
    .returning();
  res.status(201).json(serialize(copy));
});

export default router;
