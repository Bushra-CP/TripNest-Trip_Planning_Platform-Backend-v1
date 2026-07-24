import { GoogleAuthRequestDTO } from "@/dtos/auth/google-auth.dto.js";
import { LoginRequestDto } from "../../../dtos/auth/login-request.dto.js";
import { RefreshTokenResponseDto } from "../../../dtos/auth/refresh-token-response.dto.js";
import { IAuthResult } from "../../IAuthResult.js";

export interface IAuthService {
  login(data: LoginRequestDto): Promise<IAuthResult>;

  googleAuth(data: GoogleAuthRequestDTO): Promise<IAuthResult>;

  refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto>;
}
