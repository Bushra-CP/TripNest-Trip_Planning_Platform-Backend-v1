//request
export interface ResetPasswordRequestDto {
  resetToken: string;
  password: string;
}

//response
export interface ResetPasswordResponseDto {
  message: string;
}
