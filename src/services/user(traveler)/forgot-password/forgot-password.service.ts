import { TYPES } from "@/di/types";
import { ForgotPasswordDto } from "@/dtos/user(traveler)/forgot-password/forgot-password.dto";
import { ResetPasswordDto } from "@/dtos/user(traveler)/forgot-password/reset-password.dto";
import { VerifyResetOtpDto } from "@/dtos/user(traveler)/forgot-password/verify-reset-otp.dto";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IJwtService } from "@/infrastructure/jwt/IJwtService";
import { IMailService } from "@/infrastructure/mail/IMailService";
import { IOtpService } from "@/infrastructure/otp/IOtpService";
import { IPasswordService } from "@/infrastructure/password/IPasswordService";
import { IOtpRepository } from "@/interfaces/IRepository/user(traveler)/otp/IOtpRepository";
import { IUserRepository } from "@/interfaces/IRepository/user(traveler)/register/IUserRepository";
import { IForgotPasswordService } from "@/interfaces/IServices/user(traveler)/IForgotPasswordService";
import { AppError } from "@/shared/errors/app.error";
import { inject, injectable } from "inversify";

@injectable()
export class ForgotPasswordService implements IForgotPasswordService {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: IUserRepository,

    @inject(TYPES.OtpRepository)
    private readonly otpRepository: IOtpRepository,

    @inject(TYPES.OtpService)
    private readonly otpService: IOtpService,

    @inject(TYPES.PasswordService)
    private readonly passwordService: IPasswordService,

    @inject(TYPES.MailService)
    private readonly mailService: IMailService,

    @inject(TYPES.JwtService)
    private readonly jwtService: IJwtService,
  ) {}

  async forgotPassword(payload: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = payload;

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_NOT_VERIFIED);
    }

    await this.otpRepository.deleteByUserId(user._id.toString());

    const otp = this.otpService.generateOtp();

    const hashedOtp = await this.passwordService.hash(otp);

    await this.otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await this.mailService.sendOtp(user.email, user.email, otp);

    return {
      message: SuccessMessages.OTP_SENT,
    };
  }

  async verifyResetOtp(
    payload: VerifyResetOtpDto,
  ): Promise<{ message: string; resetToken: string }> {
    const { email, otp } = payload;

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    const otpRecord = await this.otpRepository.findByUserId(user._id.toString());

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await this.otpRepository.deleteByUserId(user._id.toString());

      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    const valid = await this.passwordService.compare(otp, otpRecord.otp);

    if (!valid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    await this.otpRepository.deleteByUserId(user._id.toString());

    const resetToken = this.jwtService.generateResetToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      message: SuccessMessages.OTP_VERIFIED,
      resetToken,
    };
  }

  async resendResetOtp(payload: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(payload.email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    await this.otpRepository.deleteByUserId(user._id.toString());

    const otp = this.otpService.generateOtp();

    const hashedOtp = await this.passwordService.hash(otp);

    await this.otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await this.mailService.sendOtp(user.email, user.email, otp);

    return {
      message: SuccessMessages.OTP_RESENT,
    };
  }

  async resetPassword(payload: ResetPasswordDto): Promise<{ message: string }> {
    const tokenPayload = this.jwtService.verifyResetToken(payload.resetToken);

    const user = await this.userRepository.findById(tokenPayload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    const hashedPassword = await this.passwordService.hash(payload.password);

    const updatedUser = await this.userRepository.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
      },
    );

    if (!updatedUser) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, ErrorMessages.PASSWORD_UPDATE_FAILED);
    }

    return {
      message: SuccessMessages.PASSWORD_RESET_SUCCESS,
    };
  }
}
