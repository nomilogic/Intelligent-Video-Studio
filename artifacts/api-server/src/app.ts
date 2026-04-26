import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { webhookRouter as diamondsWebhookRouter } from "./routes/diamonds";
import { logger } from "./lib/logger";
import { optionalAuth } from "./middlewares/auth";
import { errorHandler, notFoundHandler } from "./middlewares/error";
import { bootstrap } from "./lib/bootstrap";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const corsOrigins = (process.env["CORS_ORIGINS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);

app.use(cookieParser());

// IMPORTANT: Stripe webhook needs the raw body for signature verification.
// Mount ONLY the webhook route BEFORE express.json() so the body parser
// doesn't consume the stream first. The webhook handler itself uses
// express.raw(). All the other diamond routes are mounted via the main
// `router` AFTER express.json() and optionalAuth so they have a parsed
// body and `req.user` populated.
app.use("/api", diamondsWebhookRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Attach req.user when a valid session cookie is present.
app.use(optionalAuth);

app.use("/api", router);

app.use("/api", notFoundHandler);
app.use(errorHandler);

// Run bootstrap (seed defaults, create admin) once on first import.
bootstrap().catch((err) => {
  logger.error({ err }, "bootstrap failed");
});

export default app;
