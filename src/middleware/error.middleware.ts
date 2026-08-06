import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { AppError } from "../shared/errors/app.error.js";
import { STATUS_CODES } from "../enums/status.codes.enum.js";
import { env } from "../config/env.js";
import { ResponseHandler } from "../shared/http/responseHandler.js";
import { ErrorMessages, Messages, ValidationMessages } from "../enums/messages.enum.js";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types.js";
import { ILogger } from "@/shared/logger/ILogger.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

@injectable()
export class ErrorMiddleware {
  constructor(@inject(TYPES.Logger) private readonly logger: ILogger) {}

  handle(err: unknown, _req: Request, res: Response, next: NextFunction): void {
    // Prevent sending another response if one has already been sent
    if (res.headersSent) {
      return next(err);
    }

    /*-----------------------
    Custom Application Error
  ------------------------*/
    if (err instanceof AppError) {
      ResponseHandler.error(res, err.statusCode, err.message);
      return;
    }

    /*-----------------------
    Zod Validation Error
  ------------------------*/
    if (err instanceof ZodError) {
      ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ValidationMessages.VALIDATION_FAILDED);
      return;
    }

    /*-----------------------
    Invalid JWT
  ------------------------*/
    if (err instanceof JsonWebTokenError) {
      ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_TOKEN);
      return;
    }

    /*-----------------------
    Expired JWT
  ------------------------*/
    if (err instanceof TokenExpiredError) {
      ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, Messages.TOKEN_EXPIRED);
      return;
    }

    /*-----------------------
    Mongo Duplicate Key Error
  ------------------------*/
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === 11000 &&
      "keyPattern" in err
    ) {
      const field = Object.keys(err.keyPattern as Record<string, unknown>)[0];

      ResponseHandler.error(res, STATUS_CODES.CONFLICT, `${field} already exists.`);
      return;
    }

    /*-----------------------
    Mongoose Validation Error
  ------------------------*/
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      err.name === "ValidationError"
    ) {
      ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ValidationMessages.VALIDATION_FAILDED);
      return;
    }

    /*-----------------------
    Log Unknown Errors
  ------------------------*/
    if (env.NODE_ENV === "development") {
      this.logger.error(String(err));
    }

    /*-----------------------
    Fallback Error
  ------------------------*/
    console.log(err);

    ResponseHandler.error(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      ErrorMessages.INTERNAL_SERVER_ERROR,
    );
  }
}
