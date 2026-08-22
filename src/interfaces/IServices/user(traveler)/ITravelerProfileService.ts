import { UpdateProfilePictureRequestDto } from "@/dtos/user(traveler)/profile/UpdateProfilePictureRequestDto.js";
import { UpdateProfilePictureResponseDto } from "@/dtos/user(traveler)/profile/UpdateProfilePictureResponseDto.js";
import {
  TravelerProfilePayload,
  TravelerProfileResponseDto,
} from "@/dtos/user(traveler)/profile/TravelerProfileResponseDto.js";
import {
  UpdateTravelerProfileRequestDto,
  UpdateTravelerProfileResponseDto,
} from "@/dtos/user(traveler)/profile/UpdateTravelerProfileRequestDto.js";
import { RegisterRequestDto } from "@/dtos/user(traveler)/register/register-request.dto";
import { RegisterResponseDto } from "@/dtos/user(traveler)/register/register-response.dto";
import { VerifyRegistrationRequestDto } from "@/dtos/user(traveler)/register/verify-registration-request.dto";
import { IAuthResult } from "@/interfaces/IAuthResult";
import { ResendOtpRequestDto } from "@/dtos/user(traveler)/register/resend-otp-request.dto";
import { ResendOtpResponseDto } from "@/dtos/user(traveler)/register/resend-otp-response.dto";

export interface ITravelerProfileService {
  register(payload: RegisterRequestDto): Promise<RegisterResponseDto>;

  verifyRegistration(payload: VerifyRegistrationRequestDto): Promise<IAuthResult>;

  resendOtp(payload: ResendOtpRequestDto): Promise<ResendOtpResponseDto>;

  updateProfileImage(
    payload: UpdateProfilePictureRequestDto,
  ): Promise<UpdateProfilePictureResponseDto>;

  getProfile(payload: TravelerProfilePayload): Promise<TravelerProfileResponseDto>;

  updateProfile(
    payload: UpdateTravelerProfileRequestDto,
  ): Promise<UpdateTravelerProfileResponseDto>;
}
