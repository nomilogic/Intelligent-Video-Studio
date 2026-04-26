import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";
import assetsRouter from "./assets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(aiRouter);
router.use(assetsRouter);

export default router;
