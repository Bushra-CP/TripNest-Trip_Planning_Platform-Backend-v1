import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { LoginRequestDto } from "../../dtos/auth/login-request.dto";
import { refreshTokenCookieOptions } from "../../config/cookie.config";
import { STATUS_CODES } from "../../enums/status.codes.enum";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service";
import { AuthResponseDto } from "../../dtos/user(traveler)/register/verify-registration-response.dto";
import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto";
import { ForgotPasswordRequestDto } from "@/dtos/auth/forgot-password/forgot-password1.dto";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { SuccessMessages } from "@/enums/messages.enum";
import {
  VerifyResetPasswordRequestDto,
  VerifyResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/verify-reset-password2.dto";
import { ResetPasswordRequestDto } from "@/dtos/auth/forgot-password/reset-password3.dto";
import { ForgotPasswordResendOTPRequestDto } from "@/dtos/auth/forgot-password/resend-otp";
import { ChangePasswordRequest } from "@/dtos/auth/change-email-password/change-password.dto";
import { ChangeEmailRequest } from "@/dtos/auth/change-email-password/change-email.dto";
import { VerifyChangeEmailOtpRequestDto } from "@/dtos/auth/change-email-password/verify-change-email-otp.dto";
import { ResendChangeEmailOtpRequestDto } from "@/dtos/auth/change-email-password/resend-change-email-otp.dto";

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService)
    private readonly authService: IAuthService,
  ) {}

  //////////LOGIN/////////
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // console.log(req.body);

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
      const payload = req.body as ForgotPasswordRequestDto;

      const data = await this.authService.forgotPassword(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// VERIFY RESET OTP //////////
  async verifyResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as VerifyResetPasswordRequestDto;

      console.log(`/verify-reset-otp:${payload}`);

      const response = await this.authService.verifyResetOtp(payload);

      const data: VerifyResetPasswordResponseDto = {
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
      const payload = req.body as ForgotPasswordResendOTPRequestDto;

      const data = await this.authService.resendResetOtp(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// RESET PASSWORD //////////
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ResetPasswordRequestDto;

      const data = await this.authService.resetPassword(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// CHANGE PASSWORD //////////
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.userId;

      const { currentPassword, newPassword } = req.body;

      const payload: ChangePasswordRequest = { userId, currentPassword, newPassword };

      const data = await this.authService.changePassword(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// CHANGE EMAIL //////////
  async changeEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.userId;

      const { currentEmail, newEmail, currentPassword } = req.body;

      const payload: ChangeEmailRequest = { userId, currentEmail, newEmail, currentPassword };

      const data = await this.authService.changeEmail(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// VERIFY CHANGE EMAIL OTP //////////
  async verifyChangeEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as VerifyChangeEmailOtpRequestDto;

      const data = await this.authService.verifyChangeEmailOtp(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  ////////// RESEND CHANGE EMAIL OTP //////////
  async resendChangeEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const userId = req.user.userId;

      const payload: ResendChangeEmailOtpRequestDto = { userId, email };

      const data = await this.authService.resendChangeEmailOtp(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }
}
