import { ITravelerProfile } from "../../IModel/ITravelerPofile";
import { IUser } from "../../IModel/IUser";
import { IBaseRepository } from "../IBaseRepository";

export interface IAuthRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;

  getProfile(userId: string): Promise<ITravelerProfile | null>;
}
