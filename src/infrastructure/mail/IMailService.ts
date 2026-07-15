export interface IMailService {
  sendOtp(
    email: string,
    fullName: string,
    otp: string,
  ): Promise<void>;
}