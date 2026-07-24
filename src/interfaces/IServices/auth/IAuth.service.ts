import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { LoginRequestDto } from "../../../dtos/auth/login-request.dto.js";
import { RefreshTokenResponseDto } from "../../../dtos/auth/refresh-token-response.dto.js";
import { IAuthResult } from "../../IAuthResult.js";
import { ForgotPasswordDto } from "@/dtos/auth/forgot-password/forgot-password.dto.js";
import { VerifyResetOtpDto } from "@/dtos/auth/forgot-password/verify-reset-otp.dto.js";
import { ResetPasswordDto } from "@/dtos/auth/forgot-password/reset-password.dto.js";

export interface IAuthService {
  login(data: LoginRequestDto): Promise<IAuthResult>;

  googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult>;

  refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto>;

  forgotPassword(data: ForgotPasswordDto): Promise<{
    message: string;
  }>;

  verifyResetOtp(data: VerifyResetOtpDto): Promise<{
    message: string;
    resetToken: string;
  }>;

  resendResetOtp(data: ForgotPasswordDto): Promise<{
    message: string;
  }>;

  resetPassword(data: ResetPasswordDto): Promise<{
    message: string;
  }>;
}
