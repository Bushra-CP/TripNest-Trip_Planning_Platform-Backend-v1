import type { Request, Response } from "express";
import { STATUS_CODES } from "../shared/constants/status.codes.js";

export const notFoundMiddleware = (req: Request, res: Response): Response => {
  return res.status(STATUS_CODES.NOT_FOUND).json({
    success: false,
    message: `Route '${req.originalUrl}' not found.`,
  });
};
