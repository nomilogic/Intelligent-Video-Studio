import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.updatedAt);
  res.json(projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const [project] = await db.insert(projectsTable).values({
    name: body.name,
    description: body.description,
    canvasWidth: body.canvasWidth ?? 1920,
    canvasHeight: body.canvasHeight ?? 1080,
    state: JSON.stringify({ clips: [], transitions: [], canvasWidth: body.canvasWidth ?? 1920, canvasHeight: body.canvasHeight ?? 1080, duration: 0 }),
    duration: 0,
  }).returning();
  res.status(201).json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.get("/projects/:id", async (req, res) => {
  const { id } = GetProjectParams.parse(req.params);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.put("/projects/:id", async (req, res) => {
  const { id } = UpdateProjectParams.parse(req.params);
  const body = UpdateProjectBody.parse(req.body);
  const [project] = await db.update(projectsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.delete("/projects/:id", async (req, res) => {
  const { id } = DeleteProjectParams.parse(req.params);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

export default router;
