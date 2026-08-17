import { TYPES } from "@/di/types";
import {
  GetUsersRequestDto,
  GetUsersResponseDto,
  UpdateUserStatusDto,
  UserProfile,
} from "@/dtos/admin/user-management/users.dto";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";

import { IAdminUserRepository } from "@/interfaces/IRepository/admin/user-management/IAdminUserRepository";
import { IAuthRepository } from "@/interfaces/IRepository/auth/IAuth.repository";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { IUserManagementService } from "@/interfaces/IServices/admin/IUserManagementService";
import { UserMapper } from "@/mapper/users.mapper";
import { AppError } from "@/shared/errors/app.error";
import { inject } from "inversify";
import { UserProfileMapper } from "@/mapper/user-profile.mapper";

export class UserManagementService implements IUserManagementService {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly _authRepository: IAuthRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly _travelerProfileRepository: ITravelerProfileRepository,

    @inject(TYPES.UserManagementRepository)
    private readonly _userManagementRepository: IAdminUserRepository,
  ) {}

  /*-----------------------
  GET USERS
  ------------------------*/
  async getUsers(query: GetUsersRequestDto): Promise<GetUsersResponseDto> {
    const result = await this._userManagementRepository.getUsers(query);

    return {
      data: result.users.map(UserMapper.toUserResponse),

      pagination: {
        page: result.page,

        limit: result.limit,

        totalItems: result.totalItems,

        totalPages: result.totalPages,
      },
    };
  }

  /*-----------------------
  GET USER USING ID
  ------------------------*/
  async getUserDetails(userId: string): Promise<UserProfile> {
    const userProfile = await this._travelerProfileRepository.findByUserId(userId);

    if (!userProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    return UserProfileMapper.toUserProfileDto(userProfile);
  }

  /*-----------------------
  UPDATE USER STATUS 
  ------------------------*/
  async updateUserStatus(payload: UpdateUserStatusDto): Promise<UpdateUserStatusDto> {
    const user = await this._authRepository.updateById(payload.userId, {
      isActive: payload.isActive,
    });

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
    }

    return {
      userId: user._id.toString(),
      isActive: user.isActive,
    };
  }
}
