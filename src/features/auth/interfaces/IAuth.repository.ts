import type { ITravelerProfile } from "../../traveler/register/interfaces/ITravelerPofile.js";
import type { IUser } from "../../traveler/register/interfaces/IUser.js";

export interface IAuthRepository {
  findByEmail(email: string): Promise<IUser | null>;

  getProfile(userId: string): Promise<ITravelerProfile | null>;

  findById(userId: string): Promise<IUser | null>;
}
