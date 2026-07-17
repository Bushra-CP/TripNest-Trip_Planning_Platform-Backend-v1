import type { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../../di/types.js";
import type { IAuthService } from "../interfaces/IAuth.service.js";
import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { AuthResponseDto } from "../../traveler/register/dtos/verify-registration-response.dto.js";
import { refreshTokenCookieOptions } from "../../../config/cookie.config.js";
import { STATUS_CODES } from "../../../shared/constants/status.codes.js";

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService)
    private readonly authService: IAuthService,
  ) {}

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log(req.body);
      
      const payload = req.body as LoginRequestDto;

      const response = await this.authService.login(payload);

      const data: AuthResponseDto = {
        user: response.user,
        accessToken: response.accessToken,
        message: response.message,
      };

      res.cookie(
        "refreshToken",
        response.refreshToken,
        refreshTokenCookieOptions,
      );

      res.status(STATUS_CODES.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    const result = await this.authService.refreshToken(refreshToken);

    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    return res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("refreshToken", refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
}
