import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { AppError } from "../errors/app.error.js";
import { STATUS_CODES } from "../../enums/status.codes.enum.js";
import { env } from "../../config/env.js";
import { ResponseHandler } from "../http/responseHandler.js";
import { ErrorMessages, Messages, ValidationMessages } from "../../enums/messages.enum.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  /*-----------------------
  Custom Application Error
  ------------------------*/
  if (err instanceof AppError) {
    ResponseHandler.error(res, err.statusCode, err.message);
  }

  /*-----------------------
  Zod Validation Error
  ------------------------*/

  if (err instanceof ZodError) {
    ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ValidationMessages.VALIDATION_FAILDED);
  }

  /*-----------------------
  Invalid JWT
  ------------------------*/
  if (err instanceof JsonWebTokenError) {
    ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_TOKEN);
  }

  /*-----------------------
  Expired JWT
  ------------------------*/

  if (err instanceof TokenExpiredError) {
    ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, Messages.TOKEN_EXPIRED);
  }

  /*-----------------------
  Mongo Duplicate Key Error
  ------------------------*/

  if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];

    ResponseHandler.error(res, STATUS_CODES.CONFLICT, `${field} already exists.`);
  }

  /*-----------------------
  Mongoose Validation Error
  ------------------------*/

  if (typeof err === "object" && err !== null && "name" in err && err.name === "ValidationError") {
    ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ValidationMessages.VALIDATION_FAILDED);
  }

  /*-----------------------
  Log unknown errors in development
  ------------------------*/

  if (env.NODE_ENV === "development") {
    console.error(err);
  }

  ResponseHandler.error(
    res,
    STATUS_CODES.INTERNAL_SERVER_ERROR,
    ErrorMessages.INTERNAL_SERVER_ERROR,
  );
};
