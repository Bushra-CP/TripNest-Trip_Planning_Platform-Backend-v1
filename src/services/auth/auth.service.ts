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
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository.js";
import { IUser } from "@/interfaces/IModel/IUser.js";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dtos/auth/forgot-password/forgot-password1.dto.js";
import { IOtpService } from "@/infrastructure/otp/IOtpService.js";
import { IOtpRepository } from "@/interfaces/IRepository/user(traveler)/otp/IOtpRepository.js";
import { IMailService } from "@/infrastructure/mail/IMailService.js";
import {
  VerifyResetPasswordRequestDto,
  VerifyResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/verify-reset-password2.dto.js";
import {
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/reset-password3.dto.js";
import {
  ForgotPasswordResendOTPRequestDto,
  ForgotPasswordResendOTPResponseDto,
} from "@/dtos/auth/forgot-password/resend-otp.js";
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@/dtos/auth/change-email-password/change-password.dto.js";

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

  /* -------------------------
   User Login
-------------------------- */
  async login(data: LoginRequestDto): Promise<IAuthResult> {
    // Find the user
    const user = await this.authRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    // Validate account status
    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.VERIFY_EMAIL);
    }

    if (!user.isActive) {
      throw new AppError(STATUS_CODES.FORBIDDEN, Messages.ACCOUNT_DEACTIVATED);
    }

    // Verify credentials
    const passwordMatched = await this.passwordService.compare(data.password, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    // Load profile and generate tokens
    const getProfile = await this.authRepository.getProfile(user._id.toString());

    if (!getProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    const accessToken = this.jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

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

  /* -------------------------
   Google Authentication
-------------------------- */
  async googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult> {
    // Retrieve user information from Google
    const googleUser = await this.googleService.getUserInfo(data.googleAcessToken);

    const { email, sub, name, picture } = googleUser;

    // Check for an existing account
    const existingUser = await this.authRepository.findByEmail(email);

    // Validate the existing account
    if (existingUser) {
      if (existingUser.provider === AuthProvider.LOCAL) {
        throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.GOOGLE_ACCOUNT_CONFLICT);
      }

      if (!existingUser.isActive) {
        throw new AppError(STATUS_CODES.FORBIDDEN, Messages.ACCOUNT_DEACTIVATED);
      }
    }

    // Create a new Google account if one doesn't exist
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
            profileImageUrl: picture,
            rewardPoints: 0,
            socialPresence: [],
          },
          session,
        );

        return createdUser;
      });
    }

    // Load profile and generate tokens
    const profile = await this.authRepository.getProfile(user._id.toString());

    if (!profile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    const accessToken = this.jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

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

  /* -------------------------
   Refresh Access Token
-------------------------- */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    // Ensure a refresh token is provided
    if (!refreshToken) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, Messages.REFRESH_TOKEN_MISSING);
    }

    // Verify the refresh token and retrieve the user
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const user = await this.authRepository.findById(payload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Generate new access and refresh tokens
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

  /* -------------------------
   Forgot Password
-------------------------- */

  /**
   * Initiates the password reset process by sending an OTP to the user's email.
   * @param payload User's email address.
   * @returns Success message.
   */
  async forgotPassword(payload: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDto> {
    const { email } = payload;

    // Find the user
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_NOT_VERIFIED);
    }

    // Remove any existing OTP
    await this.otpRepository.deleteByUserId(user._id.toString());

    // Generate, store, and send a new OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.passwordService.hash(otp);

    await this.otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
    });

    await this.mailService.sendOtp(user.email, user.email, otp);

    return {
      message: SuccessMessages.OTP_SENT,
      userId: user._id.toString(),
    };
  }

  /**
   * Verifies the OTP and issues a reset token for password reset.
   * @param payload User's email and OTP.
   * @returns Success message and reset token.
   */
  async verifyResetOtp(
    payload: VerifyResetPasswordRequestDto,
  ): Promise<VerifyResetPasswordResponseDto> {
    const { email, otp } = payload;

    // Find the user
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Retrieve the stored OTP
    const otpRecord = await this.otpRepository.findByUserId(user._id.toString());

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    //check otp expiry
    const isExpired = Date.now() - otpRecord.createdAt.getTime() > 60 * 1000;

    if (isExpired) {
      await this.otpRepository.deleteByUserId(user._id.toString());

      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    // Validate the OTP and remove it
    const valid = await this.passwordService.compare(otp, otpRecord.otp);

    if (!valid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    await this.otpRepository.deleteByUserId(user._id.toString());

    // Generate a reset token
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
   * Resends a new OTP for password reset.
   * @param payload User's email address.
   * @returns Success message.
   */
  async resendResetOtp(
    payload: ForgotPasswordResendOTPRequestDto,
  ): Promise<ForgotPasswordResendOTPResponseDto> {
    // Find the user
    const user = await this.authRepository.findByEmail(payload.email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Remove the previous OTP
    await this.otpRepository.deleteByUserId(user._id.toString());

    // Generate, store, and send a new OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.passwordService.hash(otp);

    await this.otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
    });

    await this.mailService.sendOtp(user.email, user.email, otp);

    return {
      message: SuccessMessages.OTP_RESENT,
    };
  }

  /**
   * Resets the user's password using a valid reset token.
   * @param payload Reset token and new password.
   * @returns Success message.
   */
  async resetPassword(payload: ResetPasswordRequestDto): Promise<ResetPasswordResponseDto> {
    // Verify the reset token
    const tokenPayload = this.jwtService.verifyResetToken(payload.resetToken);

    // Retrieve the user
    const user = await this.authRepository.findById(tokenPayload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Hash and update the new password
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

  /* -------------------------
   Change Password
-------------------------- */
  async changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const { userId, currentPassword, newPassword } = payload;

    const user = await this.authRepository.findById(userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Verify credentials
    const passwordMatched = await this.passwordService.compare(currentPassword, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    // Hash and update the new password
    const hashedPassword = await this.passwordService.hash(newPassword);

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
