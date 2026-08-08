import {
  GetUsersRequestDto,
  GetUsersResponseDto,
  UpdateUserStatusDto,
  UserProfile,
} from "@/dtos/admin/user-management/users.dto";

export interface IUserManagementService {
  getUsers(query: GetUsersRequestDto): Promise<GetUsersResponseDto>;

  updateUserStatus(payload: UpdateUserStatusDto): Promise<UpdateUserStatusDto>;

  getUserDetails(userId: string): Promise<UserProfile>;
}
