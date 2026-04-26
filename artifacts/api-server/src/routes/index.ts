import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";
import assetsRouter from "./assets";
import authRouter from "./auth";
import diamondsRouter from "./diamonds";
import cloudRouter from "./cloud";
import adminRouter from "./admin";
import subtitlesRouter from "./subtitles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(aiRouter);
router.use(assetsRouter);
router.use(diamondsRouter);
router.use(cloudRouter);
router.use(subtitlesRouter);
router.use(adminRouter);

export default router;
