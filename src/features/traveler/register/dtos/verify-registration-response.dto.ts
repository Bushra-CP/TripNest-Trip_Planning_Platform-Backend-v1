export interface VerifyRegistrationResponseDto {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  accessToken: string;

  message: string;
}
