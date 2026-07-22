import { injectable } from "inversify";
import { IAuthRepository } from "../../interfaces/IRepository/auth/IAuth.repository";
import { IUser } from "../../interfaces/IModel/IUser";
import { TravelerProfileModel } from "../../models/user(traveler)/traveler-profile.model";
import { UserModel } from "../../models/auth/user.model";
import { ITravelerProfile } from "../../interfaces/IModel/ITravelerPofile";
import { BaseRepository } from "../base.repository";

@injectable()
export class AuthRepository extends BaseRepository<IUser> implements IAuthRepository {
  constructor() {
    super(UserModel);
  }

  //////////////////////////////////////////////////
  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  //////////////////////////////////////////////////
  async getProfile(userId: string): Promise<ITravelerProfile | null> {
    return TravelerProfileModel.findOne({ userId });
  }
}
