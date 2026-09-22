import { ITripRoute } from "@/interfaces/IModel/trip-planning/ITripRoute";
import { ITripRouteRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-route.repository.interface";
import { TripRouteModel } from "@/models/user(traveler)/trip-planning/trip-route.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import type { UpdateQuery } from "mongoose";

@injectable()
export class TripRouteRepository
  extends BaseRepository<ITripRoute>
  implements ITripRouteRepository
{
  constructor() {
    super(TripRouteModel);
  }

  async findByTripId(tripId: string): Promise<ITripRoute | null> {
    return this.findOne({
      tripId,
    });
  }

  async updateByTripId(tripId: string, data: UpdateQuery<ITripRoute>): Promise<ITripRoute | null> {
    const route = await this.findByTripId(tripId);

    if (!route) {
      return null;
    }

    return this.updateById(route._id.toString(), data);
  }
}
