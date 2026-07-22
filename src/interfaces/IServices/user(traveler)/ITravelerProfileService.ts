import { IAuthResult } from "../../IAuthResult.js";
import { RegisterRequestDto } from "../../../dtos/user(traveler)/register/register-request.dto.js";
import { RegisterResponseDto } from "../../../dtos/user(traveler)/register/register-response.dto.js";
import { ResendOtpRequestDto } from "../../../dtos/user(traveler)/register/resend-otp-request.dto.js";
import { ResendOtpResponseDto } from "../../../dtos/user(traveler)/register/resend-otp-response.dto.js";
import { VerifyRegistrationRequestDto } from "../../../dtos/user(traveler)/register/verify-registration-request.dto.js";

export interface ITravelerProfileService {
  register(payload: RegisterRequestDto): Promise<RegisterResponseDto>;

  verifyRegistration(payload: VerifyRegistrationRequestDto): Promise<IAuthResult>;

  resendOtp(payload: ResendOtpRequestDto): Promise<ResendOtpResponseDto>;
}
