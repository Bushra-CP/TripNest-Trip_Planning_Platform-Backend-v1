import { injectable } from "inversify";
import { IUserRepository } from "../../../interfaces/IRepository/user(traveler)/register/IUserRepository.js";
import { IUser } from "../../../interfaces/IModel/IUser.js";
import { UserModel } from "../../../models/auth/user.model.js";
import { BaseRepository } from "../../base.repository.js";

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
