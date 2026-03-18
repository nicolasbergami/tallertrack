import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { TransitionError } from "../modules/work-orders/state-machine/transitions";

export interface ApiError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Validation errors from Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos de entrada inválidos.",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Business rule violations from the state machine
  if (err instanceof TransitionError) {
    res.status(422).json({
      error: err.message,
      from: err.from,
      to: err.to,
    });
    return;
  }

  // Known HTTP errors
  if (err.statusCode) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected errors — don't leak internals in production
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Error interno del servidor. Por favor intente nuevamente.",
  });
}

// Factory for quick HTTP errors
export function createHttpError(statusCode: number, message: string): ApiError {
  const err: ApiError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
