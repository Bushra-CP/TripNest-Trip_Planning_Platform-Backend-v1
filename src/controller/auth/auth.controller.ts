import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types.js";
import { LoginRequestDto } from "../../dtos/auth/login-request.dto.js";
import { refreshTokenCookieOptions } from "../../config/cookie.config.js";
import { STATUS_CODES } from "../../enums/status.codes.enum.js";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service.js";
import { AuthResponseDto } from "../../dtos/user(traveler)/register/verify-registration-response.dto.js";
import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { ForgotPasswordDto } from "@/dtos/auth/forgot-password/forgot-password.dto.js";
import { ResponseHandler } from "@/shared/http/responseHandler.js";
import { SuccessMessages } from "@/enums/messages.enum.js";
import { VerifyResetOtpDto } from "@/dtos/auth/forgot-password/verify-reset-otp.dto.js";
import { ResetPasswordDto } from "@/dtos/auth/forgot-password/reset-password.dto.js";
import { VerifyResetOtpResponseDto } from "@/dtos/auth/forgot-password/verify-reset-otp.response.dto.js";

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService)
    private readonly authService: IAuthService,
  ) {}

  //////////LOGIN/////////
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

      res.cookie("refreshToken", response.refreshToken, refreshTokenCookieOptions);

      ResponseHandler.success(res, STATUS_CODES.CREATED, "", data);
    } catch (error) {
      next(error);
    }
  }

  //////////GOOGLE AUTH/////////
  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as GoogleAuthRequestDTO;

      // console.log(payload);

      const response = await this.authService.googleAuth(payload);

      const data: AuthResponseDto = {
        user: response.user,
        accessToken: response.accessToken,
        message: response.message,
      };

      res.cookie("refreshToken", response.refreshToken, refreshTokenCookieOptions);

      ResponseHandler.success(res, STATUS_CODES.CREATED, "", data);
    } catch (error) {
      next(error);
    }
  }

  //////////REFRESH TOKEN/////////
  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    const result = await this.authService.refreshToken(refreshToken);

    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    const data = {
      accessToken: result.accessToken,
    };

    ResponseHandler.success(res, STATUS_CODES.CREATED, "", data);
  }

  //////////LOGOUT/////////
  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("refreshToken", refreshTokenCookieOptions);

    ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.LOGOUT_SUCCESS);
  }

  ////////// FORGOT PASSWORD //////////
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ForgotPasswordDto;

      const data = await this.authService.forgotPassword(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// VERIFY RESET OTP //////////
  async verifyResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as VerifyResetOtpDto;

      const response = await this.authService.verifyResetOtp(payload);

      const data: VerifyResetOtpResponseDto = {
        message: response.message,
        resetToken: response.resetToken,
      };

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// RESEND RESET OTP //////////
  async resendResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ForgotPasswordDto;

      const data = await this.authService.resendResetOtp(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// RESET PASSWORD //////////
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ResetPasswordDto;

      const data = await this.authService.resetPassword(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }
}
