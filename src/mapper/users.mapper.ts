import { UserStatus } from "@/enums/user-status.enum";

import { UserDto, UserWithProfile } from "@/dtos/admin/user-management/users.dto";

export class UserMapper {
  static toUserResponse(user: UserWithProfile): UserDto {
    return {
      id: user.id,

      fullName: user.fullName,

      email: user.email,

      phoneNumber: user.phone ?? null,

      profileImage: user.profileImageUrl ?? null,

      role: user.role,

      status: user.isActive ? UserStatus.ACTIVE : UserStatus.BLOCKED,

      createdAt: user.createdAt,
    };
  }
}
