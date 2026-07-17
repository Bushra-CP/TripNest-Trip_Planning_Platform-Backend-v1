import { MESSAGES } from "../../../../shared/constants/messages.js";
import type { IAuthResult } from "../../../auth/interfaces/IAuthResult.js";
import type { RegisterResponseDto } from "../dtos/register-response.dto.js";
import type { ITravelerProfile } from "../interfaces/ITravelerPofile.js";
import type { IUser } from "../interfaces/IUser.js";

export class AuthMapper {
  static toAuthResponse(
    user: IUser,
    profile: ITravelerProfile,
    accessToken: string,
    refreshToken: string,
    message: string,
  ): IAuthResult {
    return {
      user: {
        id: user._id.toString(),
        fullName: profile.fullName,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      message,
    };
  }

  static toRegisterResponse(user: IUser): RegisterResponseDto {
    return {
      userId: user._id.toString(),
      email: user.email,
      message: MESSAGES.REGISTER_REQUEST_RESPONSE,
    };
  }
}
