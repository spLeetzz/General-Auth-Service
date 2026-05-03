import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import ApiError from "./api.error.js";

export function errorMiddleware(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // --- Zod validation errors → 400 with field-level detail ---
  if (err instanceof z.ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    res.status(400).json({
      error: "validation_error",
      message: details[0]?.message ?? "Invalid input",
      details,
    });
    return;
  }

  // --- Known API errors ---
  const statusCode = err.statusCode ?? 500;
  if (statusCode >= 500) console.error("[error]", err);

  const message =
    err instanceof ApiError
      ? err.message
      : statusCode >= 500
        ? "Internal server error"
        : err.message;

  res.status(statusCode).json({
    error: statusCode >= 500 ? "server_error" : "invalid_request",
    message,
  });
}
