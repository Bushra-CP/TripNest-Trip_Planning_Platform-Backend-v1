import type { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../../../di/types.js";
import type { ITravelerProfileService } from "../interfaces/ITravelerProfileService.js";
import type { RegisterRequestDto } from "../dtos/register-request.dto.js";
import { STATUS_CODES } from "../../../../shared/constants/status.codes.js";
import type { VerifyRegistrationRequestDto } from "../dtos/verify-registration-request.dto.js";
import type { ResendOtpRequestDto } from "../dtos/resend-otp-request.dto.js";
import { refreshTokenCookieOptions } from "../../../../config/cookie.config.js";
import type { AuthResponseDto } from "../dtos/verify-registration-response.dto.js";

@injectable()
export class TravelerProfileController {
  constructor(
    @inject(TYPES.TravelerProfileService)
    private readonly travelerProfileService: ITravelerProfileService,
  ) {}

  //REGISTER
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // console.log(req.body);

      const payload = req.body as RegisterRequestDto;

      const response = await this.travelerProfileService.register(payload);

      res.status(STATUS_CODES.CREATED).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  //VERIFY REGISTRATION
  async verifyRegistration(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = req.body as VerifyRegistrationRequestDto;

      const response =
        await this.travelerProfileService.verifyRegistration(payload);

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

  //RESEND OTP
  async resendOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = req.body as ResendOtpRequestDto;

      const response = await this.travelerProfileService.resendOtp(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
