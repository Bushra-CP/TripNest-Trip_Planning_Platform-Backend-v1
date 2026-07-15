import type { IUser } from "../../traveler/register/interfaces/IUser.js";

export interface IAuthRepository {
  findByEmail(email: string): Promise<IUser | null>;

  findById(userId: string): Promise<IUser | null>;
}
