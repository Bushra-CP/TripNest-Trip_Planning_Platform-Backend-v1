import { Response } from "express";
import { ApiResponse } from "./apiResponse";

export class ResponseHandler {
  static success<T>(res: Response, statusCode: number, message: string, data?: T): Response {
    const response: ApiResponse<T> = {
      success: true,
      statusCode,
      message,
      ...(data !== undefined && { data }),
    };

    return res.status(statusCode).json(response);
  }

  static error(res: Response, statusCode: number, message: string, error?: string): Response {
    const response: ApiResponse = {
      success: false,
      statusCode,
      message,
      ...(error && { error }),
    };

    return res.status(statusCode).json(response);
  }
}
