import { Request, Response, NextFunction } from "express";
import { TYPES } from "@/di/types";
import { IJwtService } from "@/infrastructure/jwt/IJwtService";
import { inject, injectable } from "inversify";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";
import { IUserRepository } from "@/interfaces/IRepository/user(traveler)/profile/IUserRepository";

@injectable()
export class AuthenticateMiddleware {
  constructor(
    @inject(TYPES.JwtService)
    private readonly jwtService: IJwtService,

    @inject(TYPES.UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
      }

      const payload = this.jwtService.verifyAccessToken(token);

      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.USER_NOT_FOUND);
      }

      if (!user.isActive) {
        throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.ACCOUNT_BLOCKED);
      }

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
