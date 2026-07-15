import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

export const validate =
  (schema: ZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body;

      next();
    } catch (error) {
      next(error);
    }
  };
