import type { RegisterRequestDto } from "../dtos/register-request.dto.js";
import type { RegisterResponseDto } from "../dtos/register-response.dto.js";
import type { ResendOtpRequestDto } from "../dtos/resend-otp-request.dto.js";
import type { ResendOtpResponseDto } from "../dtos/resend-otp-response.dto.js";
import type { VerifyRegistrationRequestDto } from "../dtos/verify-registration-request.dto.js";
import type { AuthResponseDto } from "../dtos/verify-registration-response.dto.js";

export interface ITravelerProfileService {
  register(payload: RegisterRequestDto): Promise<RegisterResponseDto>;

  verifyRegistration(
    payload: VerifyRegistrationRequestDto,
  ): Promise<AuthResponseDto>;

  resendOtp(payload: ResendOtpRequestDto): Promise<ResendOtpResponseDto>;
}
