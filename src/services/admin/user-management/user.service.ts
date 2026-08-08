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
    private readonly authRepository: IAuthRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly travelerProfileRepository: ITravelerProfileRepository,

    @inject(TYPES.UserManagementRepository)
    private readonly userManagementRepository: IAdminUserRepository,
  ) {}

  /////////////////////////////////////////////////////

  async getUsers(query: GetUsersRequestDto): Promise<GetUsersResponseDto> {
    const result = await this.userManagementRepository.getUsers(query);

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

  async updateUserStatus(payload: UpdateUserStatusDto): Promise<UpdateUserStatusDto> {
    const user = await this.authRepository.updateById(payload.userId, {
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

  async getUserDetails(userId: string): Promise<UserProfile> {
    const userProfile = await this.travelerProfileRepository.findByUserId(userId);

    if (!userProfile) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.PROFILE_NOT_FOUND);
    }

    return UserProfileMapper.toUserProfileDto(userProfile);
  }
}
