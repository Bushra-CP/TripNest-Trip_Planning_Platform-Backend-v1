import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../../di/types.js";
import { STATUS_CODES } from "../../../enums/status.codes.enum.js";
import { IForgotPasswordService } from "../../../interfaces/IServices/user(traveler)/IForgotPasswordService.js";
import { ForgotPasswordDto } from "../../../dtos/user(traveler)/forgot-password/forgot-password.dto.js";
import { VerifyResetOtpDto } from "../../../dtos/user(traveler)/forgot-password/verify-reset-otp.dto.js";
import { ResetPasswordDto } from "../../../dtos/user(traveler)/forgot-password/reset-password.dto.js";

@injectable()
export class ForgotPasswordController {
  constructor(
    @inject(TYPES.ForgotPasswordService)
    private readonly forgotPasswordService: IForgotPasswordService,
  ) {}

  ////////// FORGOT PASSWORD //////////
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ForgotPasswordDto;

      const response = await this.forgotPasswordService.forgotPassword(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  ////////// VERIFY RESET OTP //////////
  async verifyResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as VerifyResetOtpDto;

      const response = await this.forgotPasswordService.verifyResetOtp(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  ////////// RESEND RESET OTP //////////
  async resendResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ForgotPasswordDto;

      const response = await this.forgotPasswordService.resendResetOtp(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  ////////// RESET PASSWORD //////////
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ResetPasswordDto;

      const response = await this.forgotPasswordService.resetPassword(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
