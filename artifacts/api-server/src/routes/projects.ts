import { Router } from "express";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { z } from "zod/v4";
import { optionalAuth, requireAuth } from "../middlewares/auth";

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

router.get("/projects/:id", optionalAuth, async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  // Owner-scoped access. Legacy null-owner projects are accessible to anyone
  // but not editable without auth.
  if (project.userId !== null && project.userId !== req.user?.id) {
    res.status(403).json({ error: "Forbidden" });
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
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (existing.userId !== null && existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({
      ...body,
      updatedAt: new Date(),
      // Adopt orphan project on update.
      userId: existing.userId ?? req.user!.id,
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
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (existing.userId !== null && existing.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
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
  if (!src) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (src.userId !== null && src.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
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
