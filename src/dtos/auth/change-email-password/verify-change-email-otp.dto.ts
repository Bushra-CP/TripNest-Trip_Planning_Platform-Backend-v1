export interface VerifyChangeEmailOtpRequestDto {
  email: string;
  otp: string;
}

export interface VerifyChangeEmailOtpResponseDto {
  email: string;
  message: string;
}
