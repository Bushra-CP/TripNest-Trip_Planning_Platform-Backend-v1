import { MESSAGES } from "../../../../shared/constants/messages.js";
import type { RegisterResponseDto } from "../dtos/register-response.dto.js";
import type { AuthResponseDto } from "../dtos/verify-registration-response.dto.js";
import type { ITravelerProfile } from "../interfaces/ITravelerPofile.js";
import type { IUser } from "../interfaces/IUser.js";

export class AuthMapper {
  static toAuthResponse(
    user: IUser,
    profile: ITravelerProfile,
    accessToken: string,
    message: string,
  ): AuthResponseDto {
    return {
      user: {
        id: user._id.toString(),
        fullName: profile.fullName,
        email: user.email,
        role: user.role,
      },
      accessToken,
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
