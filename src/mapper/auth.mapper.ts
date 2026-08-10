import { IAuthResult } from "../interfaces/IAuthResult";
import { RegisterResponseDto } from "../dtos/user(traveler)/register/register-response.dto";
import { ITravelerProfile } from "../interfaces/IModel/ITravelerPofile";
import { IUser } from "../interfaces/IModel/IUser";

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
        fullName: profile.fullName,
        email: user.email,
        role: user.role,
        profileImage: profile.profileImageUrl || "",
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
