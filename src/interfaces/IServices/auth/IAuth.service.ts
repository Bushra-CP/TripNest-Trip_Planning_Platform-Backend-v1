import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { LoginRequestDto } from "../../../dtos/auth/login-request.dto.js";
import { RefreshTokenResponseDto } from "../../../dtos/auth/refresh-token-response.dto.js";
import { IAuthResult } from "../../IAuthResult.js";
import { ForgotPasswordRequestDto } from "@/dtos/auth/forgot-password/forgot-password1.dto.js";
import { VerifyResetPasswordRequestDto } from "@/dtos/auth/forgot-password/verify-reset-password2.dto.js";
import { ResetPasswordRequestDto } from "@/dtos/auth/forgot-password/reset-password3.dto.js";
import { ForgotPasswordResendOTPRequestDto } from "@/dtos/auth/forgot-password/verify-reset-otp.response.dto.js";

export interface IAuthService {
  login(data: LoginRequestDto): Promise<IAuthResult>;

  googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult>;

  refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto>;

  forgotPassword(data: ForgotPasswordRequestDto): Promise<{
    message: string;
  }>;

  verifyResetOtp(data: VerifyResetPasswordRequestDto): Promise<{
    message: string;
    resetToken: string;
  }>;

  resendResetOtp(data: ForgotPasswordResendOTPRequestDto): Promise<{
    message: string;
  }>;

  resetPassword(data: ResetPasswordRequestDto): Promise<{
    message: string;
  }>;
}
