import { Request, Response, NextFunction } from "express";
import { injectable } from "inversify";

import { UserRole } from "@/enums/user-role.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

import { AppError } from "@/shared/errors/app.error";

@injectable()
export class AuthorizeMiddleware {
  authorize =
    (...allowedRoles: UserRole[]) =>
    (req: Request, _res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
        }

        if (!allowedRoles.includes(req.user.role)) {
          throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.ACCESS_DENIED);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
}
