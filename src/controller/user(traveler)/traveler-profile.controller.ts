import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { ITravelerProfileService } from "../../interfaces/IServices/user(traveler)/ITravelerProfileService";
import { RegisterRequestDto } from "../../dtos/user(traveler)/register/register-request.dto";
import { STATUS_CODES } from "../../enums/status.codes.enum";
import { VerifyRegistrationRequestDto } from "../../dtos/user(traveler)/register/verify-registration-request.dto";
import { ResendOtpRequestDto } from "../../dtos/user(traveler)/register/resend-otp-request.dto";
import { refreshTokenCookieOptions } from "../../config/cookie.config";
import { ResponseHandler } from "../../shared/http/responseHandler";
import { SuccessMessages } from "../../enums/messages.enum";
import { AuthResponseDto } from "../../dtos/user(traveler)/register/verify-registration-response.dto";
import { UpdateProfilePictureRequestDto } from "@/dtos/user(traveler)/profile/UpdateProfilePictureRequestDto";
import { TravelerProfilePayload } from "@/dtos/user(traveler)/profile/TravelerProfileResponseDto";
import { UpdateTravelerProfileRequestDto } from "@/dtos/user(traveler)/profile/UpdateTravelerProfileRequestDto";

@injectable()
export class TravelerProfileController {
  constructor(
    @inject(TYPES.TravelerProfileService)
    private readonly _travelerProfileService: ITravelerProfileService,
  ) {}

  /*-----------------------
  REGISTER
  ------------------------*/
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // console.log(req.body);

      const payload = req.body as RegisterRequestDto;

      const response = await this._travelerProfileService.register(payload);

      ResponseHandler.success(
        res,
        STATUS_CODES.CREATED,
        SuccessMessages.REGISTER_REQUEST_RESPONSE,
        response,
      );
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  VERIFY REGISTRATION
  ------------------------*/
  async verifyRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as VerifyRegistrationRequestDto;

      const response = await this._travelerProfileService.verifyRegistration(payload);

      const data: AuthResponseDto = {
        user: response.user,
        accessToken: response.accessToken,
        message: response.message,
      };

      res.cookie("refreshToken", response.refreshToken, refreshTokenCookieOptions);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  RESEND OTP
  ------------------------*/
  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ResendOtpRequestDto;

      const response = await this._travelerProfileService.resendOtp(payload);

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  UPDATE PROFILE IMAGE
  ------------------------*/
  async updateProfileImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: UpdateProfilePictureRequestDto = {
        userId: req.user.userId,
        profileImage: req.file!,
      };

      const response = await this._travelerProfileService.updateProfileImage(payload);

      // console.log(response);

      ResponseHandler.success(res, STATUS_CODES.OK, "", response);
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  GET USER PROFILE
  ------------------------*/
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: TravelerProfilePayload = { userId: req.user.userId };

      const response = await this._travelerProfileService.getProfile(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", response);
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  UPDATE PROFILE
  ------------------------*/
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: UpdateTravelerProfileRequestDto = {
        userId: req.user.userId,
        fullName: req.body.fullName,
        phone: req.body.phone,
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        bio: req.body.bio,
        socialPresence: req.body.socialPresence,
      };

      // console.log(payload);

      const response = await this._travelerProfileService.updateProfile(payload);

      ResponseHandler.success(res, STATUS_CODES.OK, "", response);
    } catch (error) {
      next(error);
    }
  }
}
