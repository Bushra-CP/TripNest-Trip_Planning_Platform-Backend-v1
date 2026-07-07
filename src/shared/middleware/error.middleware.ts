import type { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { AppError } from "../errors/app.error.js";
import { env } from "../../config/env.js";
import { STATUS_CODES } from "../constants/status.codes.js";
import { ZodError } from "zod";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  // Custom Application Errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // JWT Invalid Token
  if (err instanceof JsonWebTokenError) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Invalid token.",
    });
  }

  // JWT Expired Token
  if (err instanceof TokenExpiredError) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "Token expired. Please login again.",
    });
  }

  // MongoDB Duplicate Key Error
  if ((err as { code?: number }).code === 11000) {
    return res.status(STATUS_CODES.CONFLICT).json({
      success: false,
      message: "Resource already exists.",
    });
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }

  //IF ZOD VALIDATION RELATED ERROR
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      })),
    });
  }

  // Log Unexpected Errors
  if (env.NODE_ENV !== "production") {
    console.error(err);
  }

  // Unknown Errors
  return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal Server Error",
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
