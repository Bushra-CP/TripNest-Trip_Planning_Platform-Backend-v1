import { injectable } from "inversify";
import type { IUserRepository } from "../interfaces/IUserRepository.js";
import type { IUser } from "../interfaces/IUser.js";
import { UserModel } from "../../../auth/models/user.model.js";
import type { ClientSession } from "mongoose";

@injectable()
export class UserRepository implements IUserRepository {
  //
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({
      email,
    });
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async create(user: Partial<IUser>, session?: ClientSession): Promise<IUser> {
    const createdUser = new UserModel(user);

    await createdUser.save(session ? { session } : undefined);

    return createdUser;
  }

  async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, user, { new: true });
  }
}
