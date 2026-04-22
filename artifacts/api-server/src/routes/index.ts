import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(aiRouter);

export default router;
