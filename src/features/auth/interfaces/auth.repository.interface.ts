import type { IUserModel } from "../../../../interfaces/model interfaces/user.model.interface.js";

export interface IAuthRepository {
  findByEmail(email: string): Promise<IUserModel | null>;

  findById(userId: string): Promise<IUserModel | null>;
}
