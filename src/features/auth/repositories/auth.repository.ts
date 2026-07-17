import { injectable } from "inversify";
import type { IAuthRepository } from "../interfaces/IAuth.repository.js";
import type { IUser } from "../../traveler/register/interfaces/IUser.js";
import { UserModel } from "../models/user.model.js";
import type { ITravelerProfile } from "../../traveler/register/interfaces/ITravelerPofile.js";
import { TravelerProfileModel } from "../../traveler/register/models/traveler-profile.model.js";

@injectable()
export class AuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email });
  }

  async getProfile(userId: string): Promise<ITravelerProfile | null> {
    return TravelerProfileModel.findOne({ userId });
  }

  async findById(userId: string): Promise<IUser | null> {
    return UserModel.findOne({ userId });
  }
}
