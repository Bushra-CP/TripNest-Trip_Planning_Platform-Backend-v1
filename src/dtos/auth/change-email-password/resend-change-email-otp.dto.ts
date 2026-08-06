export interface ResendChangeEmailOtpRequestDto {
  userId: string;
  email: string;
}

export interface ResendChangeEmailOtpResponseDto {
  message: string;
}
