import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { RefreshTokenResponseDto } from "../dtos/refresh-token-response.dto.js";
import type { IAuthResult } from "./IAuthResult.js";

export interface IAuthService {
  login(data: LoginRequestDto): Promise<IAuthResult>;

  refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto>;
}
