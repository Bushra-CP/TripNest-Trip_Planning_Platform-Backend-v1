import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { IAuthRepository } from "../../interfaces/IRepository/auth/IAuth.repository";
import { IJwtService } from "../../infrastructure/jwt/IJwtService";
import { LoginRequestDto } from "../../dtos/auth/login-request.dto";
import { IAuthResult } from "../../interfaces/IAuthResult";
import { AppError } from "../../shared/errors/app.error";
import { STATUS_CODES } from "../../enums/status.codes.enum";
import { IPasswordService } from "../../infrastructure/password/IPasswordService";
import { AuthMapper } from "../../mapper/auth.mapper";
import { RefreshTokenResponseDto } from "../../dtos/auth/refresh-token-response.dto";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service";
import { ErrorMessages, Messages, SuccessMessages } from "../../enums/messages.enum";
import { IGoogleService } from "@/infrastructure/google/IGoogleService";
import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto";
import { AuthProvider } from "@/enums/auth-provider.enum";
import { UserRole } from "@/enums/user-role.enum";
import { IDatabaseService } from "@/infrastructure/database/IDatabaseService";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { IUser } from "@/interfaces/IModel/IUser";
import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
} from "@/dtos/auth/forgot-password/forgot-password1.dto";
import { IOtpService } from "@/infrastructure/otp/IOtpService";
import { IMailService } from "@/infrastructure/mail/IMailService";
import {
  VerifyResetPasswordRequestDto,
  VerifyResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/verify-reset-password2.dto";
import {
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
} from "@/dtos/auth/forgot-password/reset-password3.dto";
import {
  ForgotPasswordResendOTPRequestDto,
  ForgotPasswordResendOTPResponseDto,
} from "@/dtos/auth/forgot-password/resend-otp";
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@/dtos/auth/change-email-password/change-password.dto";
import {
  ChangeEmailRequest,
  ChangeEmailResponse,
} from "@/dtos/auth/change-email-password/change-email.dto";
import {
  VerifyChangeEmailOtpRequestDto,
  VerifyChangeEmailOtpResponseDto,
} from "@/dtos/auth/change-email-password/verify-change-email-otp.dto";
import {
  ResendChangeEmailOtpRequestDto,
  ResendChangeEmailOtpResponseDto,
} from "@/dtos/auth/change-email-password/resend-change-email-otp.dto";
import { IOtpRepository } from "@/interfaces/IRepository/user(traveler)/otp/IOtpRepository";

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly _authRepository: IAuthRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly _travelerProfileRepository: ITravelerProfileRepository,

    @inject(TYPES.JwtService)
    private readonly _jwtService: IJwtService,

    @inject(TYPES.PasswordService)
    private readonly _passwordService: IPasswordService,

    @inject(TYPES.DatabaseService)
    private readonly _databaseService: IDatabaseService,

    @inject(TYPES.GoogleService)
    private readonly _googleService: IGoogleService,

    @inject(TYPES.OtpService)
    private readonly _otpService: IOtpService,

    @inject(TYPES.OtpRepository)
    private readonly _otpRepository: IOtpRepository,

    @inject(TYPES.MailService)
    private readonly _mailService: IMailService,
  ) {}

  /* -------------------------
   User Login
-------------------------- */
  async login(data: LoginRequestDto): Promise<IAuthResult> {
    // Find the user
    const user = await this._authRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Validate account status
    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.VERIFY_EMAIL);
    }

    if (!user.isActive) {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.ACCOUNT_BLOCKED);
    }

    // Verify credentials
    const passwordMatched = await this._passwordService.compare(data.password, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_EMAIL);
    }

    // Load profile and generate tokens
    const getProfile = await this._authRepository.getProfile(user._id.toString());

    if (!getProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    const accessToken = this._jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const refreshToken = this._jwtService.generateRefreshToken({
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
    const googleUser = await this._googleService.getUserInfo(data.googleAcessToken);

    const { email, sub, name, picture } = googleUser;

    // Check for an existing account
    const existingUser = await this._authRepository.findByEmail(email);

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
      user = await this._databaseService.executeTransaction(async (session) => {
        const createdUser = await this._authRepository.create(
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

        await this._travelerProfileRepository.create(
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
    const profile = await this._authRepository.getProfile(user._id.toString());

    if (!profile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    const accessToken = this._jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const refreshToken = this._jwtService.generateRefreshToken({
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
    const payload = this._jwtService.verifyRefreshToken(refreshToken);

    const user = await this._authRepository.findById(payload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Generate new access and refresh tokens
    const accessToken = this._jwtService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const newRefreshToken = this._jwtService.generateRefreshToken({
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
    const user = await this._authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_NOT_VERIFIED);
    }

    // Remove any existing OTP
    await this._otpRepository.deleteByUserId(user._id.toString());

    // Generate, store, and send a new OTP
    const otp = this._otpService.generateOtp();
    const hashedOtp = await this._passwordService.hash(otp);

    await this._otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
    });

    await this._mailService.sendOtp(user.email, user.email, otp);

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
    const user = await this._authRepository.findByEmail(email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Retrieve the stored OTP
    const otpRecord = await this._otpRepository.findByUserId(user._id.toString());

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    //check otp expiry
    const isExpired = Date.now() - otpRecord.createdAt.getTime() > 60 * 1000;

    if (isExpired) {
      await this._otpRepository.deleteByUserId(user._id.toString());

      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    // Validate the OTP and remove it
    const valid = await this._passwordService.compare(otp, otpRecord.otp);

    if (!valid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    await this._otpRepository.deleteByUserId(user._id.toString());

    // Generate a reset token
    const resetToken = this._jwtService.generateResetToken({
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
    const user = await this._authRepository.findByEmail(payload.email);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Remove the previous OTP
    await this._otpRepository.deleteByUserId(user._id.toString());

    // Generate, store, and send a new OTP
    const otp = this._otpService.generateOtp();
    const hashedOtp = await this._passwordService.hash(otp);

    await this._otpRepository.create({
      userId: user._id,
      email: user.email,
      otp: hashedOtp,
    });

    await this._mailService.sendOtp(user.email, user.email, otp);

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
    const tokenPayload = this._jwtService.verifyResetToken(payload.resetToken);

    // Retrieve the user
    const user = await this._authRepository.findById(tokenPayload.userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Hash and update the new password
    const hashedPassword = await this._passwordService.hash(payload.password);

    const updatedUser = await this._authRepository.updateOne(
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

    const user = await this._authRepository.findById(userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    // Verify credentials
    const passwordMatched = await this._passwordService.compare(currentPassword, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.PASSWORD_NOT_MATCHING);
    }

    // Hash and update the new password
    const hashedPassword = await this._passwordService.hash(newPassword);

    const updatedUser = await this._authRepository.updateOne(
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
   Change Email
   Sends an OTP to verify a new email address.
-------------------------- */
  async changeEmail(payload: ChangeEmailRequest): Promise<ChangeEmailResponse> {
    const { userId, currentEmail, newEmail, currentPassword } = payload;

    const user = await this._authRepository.findByEmail(currentEmail);

    // console.log(user);

    if (!user) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.USER_NOT_FOUND);
    }

    // Verify password
    const passwordMatched = await this._passwordService.compare(currentPassword, user.password!);

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.PASSWORD_NOT_MATCHING);
    }

    //check whether email already exists
    const existingUser = await this._authRepository.findByEmail(newEmail);

    if (existingUser) {
      throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.EMAIL_CONFLICT_MESSSAGE);
    }

    // Remove any existing OTP
    await this._otpRepository.deleteByUserId(userId);

    // Generate, store, and send a new OTP
    const otp = this._otpService.generateOtp();
    const hashedOtp = await this._passwordService.hash(otp);

    await this._otpRepository.create({
      userId: user._id,
      email: newEmail,
      otp: hashedOtp,
    });

    const profile = await this._travelerProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }
    await this._mailService.sendOtp(newEmail, profile?.fullName, otp);

    return {
      message: SuccessMessages.OTP_SENT,
      userId,
      email: newEmail,
    };
  }

  /* -------------------------
   Verify Change Email OTP
   Verifies the OTP and updates the user's email.
-------------------------- */
  async verifyChangeEmailOtp(
    payload: VerifyChangeEmailOtpRequestDto,
  ): Promise<VerifyChangeEmailOtpResponseDto> {
    const { email, otp } = payload;

    // Retrieve the stored OTP
    const otpRecord = await this._otpRepository.findByEmail(email);

    // console.log(otpRecord);

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    // Check expiry
    const isExpired = Date.now() - otpRecord.createdAt.getTime() > 60 * 1000;

    if (isExpired) {
      await this._otpRepository.deleteByUserId(otpRecord.userId.toString());

      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    // Verify OTP
    const valid = await this._passwordService.compare(otp, otpRecord.otp);

    if (!valid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    // Update email
    const updatedUser = await this._authRepository.updateOne(
      {
        _id: otpRecord.userId,
      },
      {
        email,
      },
    );

    if (!updatedUser) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, ErrorMessages.EMAIL_UPDATE_FAILED);
    }

    // Remove OTP
    await this._otpRepository.deleteByUserId(otpRecord.userId.toString());

    return {
      email,
      message: SuccessMessages.EMAIL_UPDATED_SUCCESSFULLY,
    };
  }

  /* -------------------------
   Resend Change Email OTP
   Sends an OTP to verify a new email address.
-------------------------- */
  async resendChangeEmailOtp(
    payload: ResendChangeEmailOtpRequestDto,
  ): Promise<ResendChangeEmailOtpResponseDto> {
    const { userId, email } = payload;

    //find user
    const user = await this._authRepository.findById(userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    //Remove Previous OTP
    await this._otpRepository.deleteByUserId(user._id.toString());

    //Generate New OTP
    const otp = this._otpService.generateOtp();

    //Hash OTP
    const hashedOtp = await this._passwordService.hash(otp);

    await this._otpRepository.create({
      userId: user._id,
      email,
      otp: hashedOtp,
    });

    //Find Traveler Profile
    const profile = await this._travelerProfileRepository.findByUserId(user._id.toString());

    if (!profile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    await this._mailService.sendOtp(email, profile!.fullName, otp);

    return {
      message: SuccessMessages.OTP_RESENT,
    };
  }
}
