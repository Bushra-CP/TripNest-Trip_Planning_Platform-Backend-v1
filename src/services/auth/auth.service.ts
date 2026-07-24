import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types.js";
import { IAuthRepository } from "../../interfaces/IRepository/auth/IAuth.repository.js";
import { IJwtService } from "../../infrastructure/jwt/IJwtService.js";
import { LoginRequestDto } from "../../dtos/auth/login-request.dto.js";
import { IAuthResult } from "../../interfaces/IAuthResult.js";
import { AppError } from "../../shared/errors/app.error.js";
import { STATUS_CODES } from "../../enums/status.codes.enum.js";
import { IPasswordService } from "../../infrastructure/password/IPasswordService.js";
import { AuthMapper } from "../../mapper/auth.mapper.js";
import { RefreshTokenResponseDto } from "../../dtos/auth/refresh-token-response.dto.js";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service.js";
import { ErrorMessages, Messages, SuccessMessages } from "../../enums/messages.enum.js";
import { IGoogleService } from "@/infrastructure/google/IGoogleService.js";
import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { AuthProvider } from "@/enums/auth-provider.enum.js";
import { UserRole } from "@/enums/user-role.enum.js";
import { IDatabaseService } from "@/infrastructure/database/IDatabaseService.js";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/register/ITravelerProfileRepository.js";
import { IUser } from "@/interfaces/IModel/IUser.js";
import { ForgotPasswordDto } from "@/dtos/auth/forgot-password/forgot-password.dto.js";
import { IOtpService } from "@/infrastructure/otp/IOtpService.js";
import { IOtpRepository } from "@/interfaces/IRepository/user(traveler)/otp/IOtpRepository.js";
import { IMailService } from "@/infrastructure/mail/IMailService.js";
import { VerifyResetOtpDto } from "@/dtos/auth/forgot-password/verify-reset-otp.dto.js";
import { ResetPasswordDto } from "@/dtos/auth/forgot-password/reset-password.dto.js";

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly authRepository: IAuthRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly travelerProfileRepository: ITravelerProfileRepository,

    @inject(TYPES.JwtService)
    private readonly jwtService: IJwtService,

    @inject(TYPES.PasswordService)
    private readonly passwordService: IPasswordService,

    @inject(TYPES.DatabaseService)
    private readonly databaseService: IDatabaseService,

    @inject(TYPES.GoogleService)
    private readonly googleService: IGoogleService,

    @inject(TYPES.OtpService)
    private readonly otpService: IOtpService,

    @inject(TYPES.OtpRepository)
    private readonly otpRepository: IOtpRepository,

    @inject(TYPES.MailService)
    private readonly mailService: IMailService,
  ) {}

  /*-----------------------
  login logic
  ------------------------*/
  async login(data: LoginRequestDto): Promise<IAuthResult> {
    ///////////////get user by email//////////////////
    const user = await this.authRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.VERIFY_EMAIL);
    }

    if (!user.isActive) {
      throw new AppError(STATUS_CODES.FORBIDDEN, Messages.ACCOUNT_DEACTIVATED);
    }

    ///////////////check password match//////////////////
    const passwordMatched = await this.passwordService.compare(data.password, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    ///////////////get user profile//////////////////
    const getProfile = await this.authRepository.getProfile(user._id.toString());

    if (!getProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    ///////////////generate access token//////////////////
    const accessToken = this.jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    ///////////////generate refresh token//////////////////
    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return AuthMapper.toAuthResponse(
      user,
      getProfile,
      accessToken,
      refreshToken,
      SuccessMessages.LOGIN_SUCCESS,
    );
  }

  /*-----------------------
  google auth logic
  ------------------------*/
  async googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult> {
    ///////////get google user////////////

    // console.log(`in service:${data.googleAcessToken}`);

    const googleUser = await this.googleService.getUserInfo(data.googleAcessToken);

    const { email, sub, name, picture } = googleUser;

    ///////////check if user already exists////////////
    const existingUser = await this.authRepository.findByEmail(email);

    ///////////validation checks for existing user////////////
    if (existingUser) {
      if (existingUser.provider === AuthProvider.LOCAL) {
        throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.GOOGLE_ACCOUNT_CONFLICT);
      }

      if (!existingUser.isActive) {
        throw new AppError(
          STATUS_CODES.FORBIDDEN,

          Messages.ACCOUNT_DEACTIVATED,
        );
      }
    }

    ///////////if user not exists////////////
    let user: IUser;

    if (existingUser) {
      user = existingUser;
    } else {
      user = await this.databaseService.executeTransaction(async (session) => {
        const createdUser = await this.authRepository.create(
          {
            email,
            provider: AuthProvider.GOOGLE,
            providerId: sub,
            role: UserRole.TRAVELER,
            isVerified: true,
            isActive: true,
          },
          session,
        );

        await this.travelerProfileRepository.create(
          {
            userId: createdUser._id,
            fullName: name,
            profileImage: picture,
            rewardPoints: 0,
            socialPresence: [],
          },
          session,
        );

        return createdUser;
      });
    }

    ///////////get user profile////////////
    const profile = await this.authRepository.getProfile(user._id.toString());

    if (!profile) {
      throw new AppError(
        STATUS_CODES.NOT_FOUND,

        ErrorMessages.PROFILE_NOT_FOUND,
      );
    }

    //////////////generate access token//////////////////
    const accessToken = this.jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    ///////////////generate refresh token//////////////////
    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return AuthMapper.toAuthResponse(
      user,
      profile,
      accessToken,
      refreshToken,
      SuccessMessages.LOGIN_SUCCESS,
    );
  }

  /*-----------------------
  refresh token logic
  ------------------------*/
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    if (!refreshToken)
      throw new AppError(STATUS_CODES.UNAUTHORIZED, Messages.REFRESH_TOKEN_MISSING);

    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const user = await this.authRepository.findById(payload.userId);

    if (!user) throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);

    const accessToken = this.jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const newRefreshToken = this.jwtService.generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /*-----------------------
  forgot password related logic
  ------------------------*/

  /**
   * first stage of forgot password
   * @param payload : email
   * @returns a success 'otp sent to mail' success message
   */

  async forgotPassword(payload: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = payload;

    //////////////fetch user with mail//////////////////
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_NOT_VERIFIED);
    }

    //////////////delete any existing otps//////////////////
    await this.otpRepository.deleteByUserId(user._id.toString());

    ////////generate new otp, hash, save it and send to email/////////
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

  /**
   * second stage of forgot password
   * @param payload : email, otp
   * @returns a success message and
   *          a resetToken - that serve as a security constraint at time of resetting password
   */

  async verifyResetOtp(
    payload: VerifyResetOtpDto,
  ): Promise<{ message: string; resetToken: string }> {
    const { email, otp } = payload;

    //////////////fetch user with mail//////////////////
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    //////////////fetch otp from db//////////////////
    const otpRecord = await this.otpRepository.findByUserId(user._id.toString());

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    //////////////check if otp is valid and delete it from db//////////////////
    const valid = await this.passwordService.compare(otp, otpRecord.otp);

    if (!valid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    await this.otpRepository.deleteByUserId(user._id.toString());

    //////////////generate reset token//////////////////
    const resetToken = this.jwtService.generateResetToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      message: SuccessMessages.OTP_VERIFIED,
      resetToken,
    };
  }

  /**
   * resend otp stage of forgot password
   * @param payload : email, otp
   * @returns a success message and
   *          a resetToken - that serve as a security constraint at time of resetting password
   */

  async resendResetOtp(payload: ForgotPasswordDto): Promise<{ message: string }> {
    //////////////fetch user with mail//////////////////
    const user = await this.authRepository.findByEmail(payload.email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    //////////////delete any existing otp from db//////////////////
    await this.otpRepository.deleteByUserId(user._id.toString());

    //////////////generate new otp, hash, save and send via mail//////////////////
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

  /**
   * third stage of forgot password
   * @param payload : reset token and new password
   * @returns a success message - password reset
   */

  async resetPassword(payload: ResetPasswordDto): Promise<{ message: string }> {
    ///get payload with resetToken. so we will get userId///
    const tokenPayload = this.jwtService.verifyResetToken(payload.resetToken);

    ///fetch user with userId///
    const user = await this.authRepository.findById(tokenPayload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    const hashedPassword = await this.passwordService.hash(payload.password);

    const updatedUser = await this.authRepository.updateOne(
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
