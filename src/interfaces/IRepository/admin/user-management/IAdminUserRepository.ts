import { GetUsersRequestDto, PaginatedUsers } from "@/dtos/admin/user-management/users.dto";
import { IBaseRepository } from "../../IBaseRepository";
import { IUser } from "@/interfaces/IModel/IUser";

export interface IAdminUserRepository extends IBaseRepository<IUser> {
  getUsers(query: GetUsersRequestDto): Promise<PaginatedUsers>;

  // updateUserStatus(userId: string, isActive: boolean): Promise<IUser>;
}
