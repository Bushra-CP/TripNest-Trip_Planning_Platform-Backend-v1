import { ITravelerProfile } from "../../IModel/ITravelerPofile.js";
import { IUser } from "../../IModel/IUser.js";
import { IBaseRepository } from "../IBaseRepository.js";

export interface IAuthRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;

  getProfile(userId: string): Promise<ITravelerProfile | null>;
}
