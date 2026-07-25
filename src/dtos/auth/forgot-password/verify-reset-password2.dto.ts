//request
export interface VerifyResetPasswordRequestDto {
  email: string;
  otp: string;
}

//response
export interface VerifyResetPasswordResponseDto {
  message: string;
  resetToken: string;
}
