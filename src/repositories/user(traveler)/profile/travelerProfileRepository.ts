import { injectable } from "inversify";
import { ITravelerProfileRepository } from "../../../interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { ITravelerProfile } from "../../../interfaces/IModel/ITravelerPofile";
import { TravelerProfileModel } from "../../../models/user(traveler)/traveler-profile.model";
import { BaseRepository } from "../../base.repository";

@injectable()
export class TravelerProfileRepository
  extends BaseRepository<ITravelerProfile>
  implements ITravelerProfileRepository
{
  constructor() {
    super(TravelerProfileModel);
  }

  async findByUserId(userId: string): Promise<ITravelerProfile | null> {
    return this.findOne({ userId });
  }
}
