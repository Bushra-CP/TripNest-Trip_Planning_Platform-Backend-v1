import { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";
import { ITripVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-vehicle-repo.interface";
import { TripVehicleModel } from "@/models/user(traveler)/trip-planning/trip-vehicle.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";

@injectable()
export class TripVehicleRepository
  extends BaseRepository<ITripVehicle>
  implements ITripVehicleRepository
{
  constructor() {
    super(TripVehicleModel);
  }

  async findByTripId(tripId: string): Promise<ITripVehicle[]> {
    return this.find({
      tripId,
    });
  }

  async findByTripAndVehicle(tripId: string, vehicleId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      vehicleId,
    });
  }

  async findSelectedByTripId(tripId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      selected: true,
    });
  }
}
