import { ForgotPasswordDto } from "@/dtos/user(traveler)/forgot-password/forgot-password.dto";
import { ResetPasswordDto } from "@/dtos/user(traveler)/forgot-password/reset-password.dto";
import { VerifyResetOtpDto } from "@/dtos/user(traveler)/forgot-password/verify-reset-otp.dto";

export interface IForgotPasswordService {
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
