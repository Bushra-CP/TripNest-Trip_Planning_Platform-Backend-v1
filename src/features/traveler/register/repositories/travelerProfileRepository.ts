import { injectable } from "inversify";
import type { ITravelerProfileRepository } from "../interfaces/ITravelerProfileRepository.js";
import type { ClientSession } from "mongoose";
import type { ITravelerProfile } from "../interfaces/ITravelerPofile.js";
import { TravelerProfileModel } from "../models/traveler-profile.model.js";

@injectable()
export class TravelerProfileRepository implements ITravelerProfileRepository {
  async create(
    profile: Partial<ITravelerProfile>,
    session?: ClientSession,
  ): Promise<ITravelerProfile> {
    const createdProfile = session
      ? await TravelerProfileModel.create([profile], { session })
      : await TravelerProfileModel.create([profile]);

    return createdProfile[0]!;
  }

  async findByUserId(userId: string): Promise<ITravelerProfile | null> {
    return TravelerProfileModel.findOne({ userId });
  }

  async update(
    userId: string,
    data: Partial<ITravelerProfile>,
  ): Promise<ITravelerProfile | null> {
    return TravelerProfileModel.findByIdAndUpdate({ userId }, data, {
      new: true,
    });
  }
}
