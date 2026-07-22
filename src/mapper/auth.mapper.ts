import { IAuthResult } from "../interfaces/IAuthResult.js";
import { RegisterResponseDto } from "../dtos/user(traveler)/register/register-response.dto.js";
import { ITravelerProfile } from "../interfaces/IModel/ITravelerPofile.js";
import { IUser } from "../interfaces/IModel/IUser.js";

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
    };
  }
}
