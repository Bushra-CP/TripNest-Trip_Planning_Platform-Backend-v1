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
      SuccessMessages.REGISTRATION_COMPLETED_SUCCESSFULLY,
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
