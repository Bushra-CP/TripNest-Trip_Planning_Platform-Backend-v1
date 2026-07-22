import { IUser } from "../../../IModel/IUser.js";
import { IBaseRepository } from "../../IBaseRepository.js";

export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}
