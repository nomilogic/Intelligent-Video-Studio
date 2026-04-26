import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod/v4";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", issues: err.issues });
    return;
  }
  req.log?.error({ err }, "request failed");
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err?.message ?? "Internal server error",
  });
}
