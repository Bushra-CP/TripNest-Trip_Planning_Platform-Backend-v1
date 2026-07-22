import { inject, injectable } from "inversify";
import { ITravelerProfileService } from "../../../interfaces/IServices/user(traveler)/ITravelerProfileService";
import { TYPES } from "../../../di/types";
import { IUserRepository } from "../../../interfaces/IRepository/user(traveler)/register/IUserRepository";
import { ITravelerProfileRepository } from "../../../interfaces/IRepository/user(traveler)/register/ITravelerProfileRepository";
import { IOtpRepository } from "../../../interfaces/IRepository/user(traveler)/otp/IOtpRepository";
import { IOtpService } from "../../../infrastructure/otp/IOtpService";
import { IPasswordService } from "../../../infrastructure/password/IPasswordService";
import { IMailService } from "../../../infrastructure/mail/IMailService";
import { IJwtService } from "../../../infrastructure/jwt/IJwtService";
import { IDatabaseService } from "../../../infrastructure/database/IDatabaseService";
import { RegisterRequestDto } from "../../../dtos/user(traveler)/register/register-request.dto";
import { RegisterResponseDto } from "../../../dtos/user(traveler)/register/register-response.dto";
import { AppError } from "../../../shared/errors/app.error";
import { STATUS_CODES } from "../../../enums/status.codes.enum";
import { ErrorMessages, SuccessMessages } from "../../../enums/messages.enum";
import { AuthProvider } from "../../../enums/auth-provider.enum";
import { UserRole } from "../../../enums/user-role.enum";
import { AuthMapper } from "../../../mapper/auth.mapper";
import { VerifyRegistrationRequestDto } from "../../../dtos/user(traveler)/register/verify-registration-request.dto";
import { IAuthResult } from "../../../interfaces/IAuthResult";
import { ResendOtpRequestDto } from "../../../dtos/user(traveler)/register/resend-otp-request.dto";
import { ResendOtpResponseDto } from "../../../dtos/user(traveler)/register/resend-otp-response.dto";

injectable();
export class TravelerProfileService implements ITravelerProfileService {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: IUserRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly travelerProfileRepository: ITravelerProfileRepository,

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

    @inject(TYPES.DatabaseService)
    private readonly databaseService: IDatabaseService,
  ) {}

  /*-----------------------
  register logic
  ------------------------*/
  async register(payload: RegisterRequestDto): Promise<RegisterResponseDto> {
    const { fullName, email, password, phone } = payload;

    console.log(payload);
    console.log(password);

    ///////////////check whether email already exists//////////////////
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.EMAIL_CONFLICT_MESSSAGE);
    }

    ///////////////hash password//////////////////
    const hashedPassword = await this.passwordService.hash(password);

    ///////////////execute transaction session to register user//////////////////
    const createdUser = await this.databaseService.executeTransaction(async (session) => {
      const user = this.userRepository.create(
        {
          email,
          password: hashedPassword,
          provider: AuthProvider.LOCAL,
          providerId: "",
          role: UserRole.TRAVELER,
          isVerified: false,
          isActive: true,
        },
        session,
      );

      await this.travelerProfileRepository.create(
        {
          userId: (await user)._id,
          fullName,
          phone,
          rewardPoints: 0,
          socialPresence: [],
        },
        session,
      );

      return user;
    });

    ///////////////generate otp//////////////////
    const otp = this.otpService.generateOtp();

    ///////////////hash otp//////////////////
    const hashedOtp = await this.passwordService.hash(otp);

    ///////////////delete previous otp//////////////////
    await this.otpRepository.deleteByUserId(createdUser._id.toString());

    ///////////////save otp and send otp mail//////////////////
    try {
      ///////////////save otp//////////////////
      await this.otpRepository.create({
        userId: createdUser._id,
        email: createdUser.email,
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 60 * 1000),
      });

      ///////////////send otp mail//////////////////
      await this.mailService.sendOtp(createdUser.email, fullName, otp);
    } catch (error) {
      ///////////////if sending the email fails, the OTP record is also removed//////////////////
      await this.otpRepository.deleteByUserId(createdUser._id.toString());

      throw error;
    }

    ///////////////return response//////////////////
    return AuthMapper.toRegisterResponse(createdUser);
  }

  /*-----------------------
  verify registration logic
  TO MAKE isVerified TRUE AFTER OTP VERIFICATION
  ------------------------*/
  async verifyRegistration(payload: VerifyRegistrationRequestDto): Promise<IAuthResult> {
    const { userId, otp } = payload;

    ///////////////find user//////////////////
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    ///////////////if already verified//////////////////
    if (user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_ALREADY_VERIFIED);
    }

    ///////////////find traveler profile//////////////////
    const travelerProfile = await this.travelerProfileRepository.findByUserId(userId);

    if (!travelerProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    ///////////////find otp//////////////////
    const otpRecord = await this.otpRepository.findByUserId(userId);

    if (!otpRecord) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.OTP_EXPIRED);
    }

    ///////////////compare otp//////////////////
    const isOtpValid = await this.passwordService.compare(otp, otpRecord.otp);

    if (!isOtpValid) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_OTP);
    }

    ///////////////mark user verified//////////////////
    const updatedUser = await this.userRepository.updateOne(
      { userId },
      {
        isVerified: true,
      },
    );

    if (!updatedUser) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, ErrorMessages.USER_CANNOT_VERIFIED);
    }

    ///////////////delete otp//////////////////
    await this.otpRepository.deleteByUserId(userId);

    ///////////////generate access token//////////////////
    const accessToken = this.jwtService.generateAccessToken({
      userId: updatedUser._id.toString(),
      role: updatedUser.role,
    });

    ///////////////genrate refresh token//////////////////
    const refreshToken = this.jwtService.generateRefreshToken({
      userId: updatedUser._id.toString(),
      role: updatedUser.role,
    });

    ///////////////return response//////////////////
    return AuthMapper.toAuthResponse(
      updatedUser,
      travelerProfile,
      accessToken,
      refreshToken,
      SuccessMessages.REGISTRATION_COMPLETED_SUCCESSFULLY,
    );
  }

  /*-----------------------
  resend otp logic
  ------------------------*/
  async resendOtp(payload: ResendOtpRequestDto): Promise<ResendOtpResponseDto> {
    const { userId } = payload;

    ///////////////find user//////////////////
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    ///////////////Already Verified//////////////////
    if (user.isVerified) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.USER_ALREADY_VERIFIED);
    }

    ///////////////Find Traveler Profile//////////////////
    const travelerProfile = await this.travelerProfileRepository.findByUserId(userId);

    if (!travelerProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    ///////////////Remove Previous OTP//////////////////
    await this.otpRepository.deleteByUserId(userId);

    ///////////////Generate New OTP//////////////////
    const otp = this.otpService.generateOtp();

    ///////////////Hash OTP//////////////////
    const hashedOtp = await this.passwordService.hash(otp);

    ///////////////Save OTP//////////////////
    await this.otpRepository.create({
      userId: user._id,

      email: user.email,

      otp: hashedOtp,

      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    ///////////////Send Email//////////////////
    await this.mailService.sendOtp(
      user.email,

      travelerProfile.fullName,

      otp,
    );

    return {
      message: SuccessMessages.OTP_RESENT,
    };
  }
}
