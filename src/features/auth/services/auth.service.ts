import { inject, injectable } from "inversify";
import type { IAuthService } from "../interfaces/IAuth.service.js";
import { TYPES } from "../../../di/types.js";
import type { IAuthRepository } from "../interfaces/IAuth.repository.js";
import type { IJwtService } from "../../../infrastructure/jwt/IJwtService.js";
import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { IAuthResult } from "../interfaces/IAuthResult.js";
import { AppError } from "../../../shared/errors/app.error.js";
import { STATUS_CODES } from "../../../shared/constants/status.codes.js";
import { MESSAGES } from "../../../shared/constants/messages.js";
import type { IPasswordService } from "../../../infrastructure/password/IPasswordService.js";
import { AuthMapper } from "../../traveler/register/mapper/auth.mapper.js";
import type { RefreshTokenResponseDto } from "../dtos/refresh-token-response.dto.js";

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly authRepository: IAuthRepository,

    @inject(TYPES.JwtService)
    private readonly jwtService: IJwtService,

    @inject(TYPES.PasswordService)
    private readonly passwordService: IPasswordService,
  ) {}

  async login(data: LoginRequestDto): Promise<IAuthResult> {
    const user = await this.authRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, MESSAGES.INVALID_EMAIL);
    }

    if (!user.isVerified) {
      throw new AppError(STATUS_CODES.FORBIDDEN, MESSAGES.VERIFY_EMAIL);
    }

    if (!user.isActive) {
      throw new AppError(STATUS_CODES.FORBIDDEN, MESSAGES.ACCOUNT_DEACTIVATED);
    }

    const passwordMatched = await this.passwordService.compare(
      data.password,
      user.password!,
    );

    if (!passwordMatched) {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, MESSAGES.INVALID_EMAIL);
    }

    const getProfile = await this.authRepository.getProfile(
      user._id.toString(),
    );

    if (!getProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, MESSAGES.PROFILE_NOT_FOUND);
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
      MESSAGES.REGISTRATION_COMPLETED_SUCCESSFULLY,
    );
  }
  //////////////////////////////////
  //refresh token logic
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    if (!refreshToken)
      throw new AppError(
        STATUS_CODES.UNAUTHORIZED,
        MESSAGES.REFRESH_TOKEN_MISSING,
      );

    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const user = await this.authRepository.findById(payload.userId);

    if (!user)
      throw new AppError(STATUS_CODES.NOT_FOUND, MESSAGES.USER_NOT_FOUND);

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
