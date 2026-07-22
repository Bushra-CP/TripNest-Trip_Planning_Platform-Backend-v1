import { injectable } from "inversify";
import { ITravelerProfileRepository } from "../../../interfaces/IRepository/user(traveler)/register/ITravelerProfileRepository.js";
import { ITravelerProfile } from "../../../interfaces/IModel/ITravelerPofile.js";
import { TravelerProfileModel } from "../../../models/user(traveler)/traveler-profile.model.js";
import { BaseRepository } from "../../base.repository.js";

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
