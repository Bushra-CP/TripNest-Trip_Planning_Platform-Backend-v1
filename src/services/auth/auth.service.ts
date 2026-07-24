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
}
