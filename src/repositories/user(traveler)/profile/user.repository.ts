import { injectable } from "inversify";
import { IUserRepository } from "../../../interfaces/IRepository/user(traveler)/profile/IUserRepository";
import { IUser } from "../../../interfaces/IModel/IUser";
import { UserModel } from "../../../models/auth/user.model";
import { BaseRepository } from "../../base.repository";

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({
      email,
    });
  }
}
