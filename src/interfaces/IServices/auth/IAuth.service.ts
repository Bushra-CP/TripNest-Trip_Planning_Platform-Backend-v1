import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { LoginRequestDto } from "../../../dtos/auth/login-request.dto.js";
import { RefreshTokenResponseDto } from "../../../dtos/auth/refresh-token-response.dto.js";
import { IAuthResult } from "../../IAuthResult.js";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dtos/auth/forgot-password/forgot-password1.dto.js";
import {
  VerifyResetPasswordRequestDto,
  VerifyResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/verify-reset-password2.dto.js";
import {
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/reset-password3.dto.js";
import {
  ForgotPasswordResendOTPRequestDto,
  ForgotPasswordResendOTPResponseDto,
} from "@/dtos/auth/forgot-password/resend-otp.js";
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@/dtos/auth/change-email-password/change-password.dto.js";

export interface IAuthService {
  login(data: LoginRequestDto): Promise<IAuthResult>;

  googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult>;

  refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto>;

  forgotPassword(data: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDto>;

  verifyResetOtp(data: VerifyResetPasswordRequestDto): Promise<VerifyResetPasswordResponseDto>;

  resendResetOtp(
    data: ForgotPasswordResendOTPRequestDto,
  ): Promise<ForgotPasswordResendOTPResponseDto>;

  resetPassword(data: ResetPasswordRequestDto): Promise<ResetPasswordResponseDto>;

  changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse>;
}
