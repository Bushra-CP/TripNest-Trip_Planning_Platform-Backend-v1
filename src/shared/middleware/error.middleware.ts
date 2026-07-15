import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { AppError } from "../errors/app.error.js";
import { STATUS_CODES } from "../constants/status.codes.js"
import { env } from "../../config/env.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  // Custom Application Error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Invalid JWT
  if (err instanceof JsonWebTokenError) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Expired JWT
  if (err instanceof TokenExpiredError) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Token expired. Please login again.",
    });
  }

  // Mongo Duplicate Key Error
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === 11000
  ) {
    const field = Object.keys((err as any).keyPattern)[0];

    return res.status(STATUS_CODES.CONFLICT).json({
      success: false,
      message: `${field} already exists.`,
    });
  }

  // Mongoose Validation Error
  if (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    err.name === "ValidationError"
  ) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: "Validation failed.",
    });
  }

  // Log unknown errors in development
  if (env.NODE_ENV === "development") {
    console.error(err);
  }

  return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal Server Error",
  });
};
