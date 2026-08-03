import { Request, Response, NextFunction } from "express";
import { TYPES } from "@/di/types";
import { IJwtService } from "@/infrastructure/jwt/IJwtService";
import { inject, injectable } from "inversify";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

@injectable()
export class AuthenticateMiddleware {
  constructor(
    @inject(TYPES.JwtService)
    private readonly jwtService: IJwtService,
  ) {}

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
      }

      const payload = this.jwtService.verifyAccessToken(token);

      req.user = {
        userId: payload.userId,
        role: payload.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
