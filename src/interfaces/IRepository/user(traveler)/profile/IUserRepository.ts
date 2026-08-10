import { IUser } from "../../../IModel/IUser";
import { IBaseRepository } from "../../IBaseRepository";

export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}
