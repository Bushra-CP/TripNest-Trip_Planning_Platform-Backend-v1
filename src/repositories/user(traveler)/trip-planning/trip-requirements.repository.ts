import { ITripRequirements } from "@/interfaces/IModel/trip-planning/ITripRequirements";
import { ITripRequirementsRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-requirements.repository.interface";
import { TripRequirementsModel } from "@/models/user(traveler)/trip-planning/trip-requirements.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import { UpdateQuery } from "mongoose";

@injectable()
export class TripRequirementsRepository
  extends BaseRepository<ITripRequirements>
  implements ITripRequirementsRepository
{
  constructor() {
    super(TripRequirementsModel);
  }

  async findByTripId(tripId: string): Promise<ITripRequirements | null> {
    return this.findOne({
      tripId,
    });
  }

  async updateByTripId(
    tripId: string,
    data: UpdateQuery<ITripRequirements>,
  ): Promise<ITripRequirements | null> {
    const requirements = await this.findByTripId(tripId);

    if (!requirements) {
      return null;
    }

    return this.updateById(requirements._id.toString(), data);
  }
}
