import { injectable } from "inversify";

import { IVehicle } from "@/interfaces/IModel/trip-planning/IVehicle";
import { VehicleModel } from "@/models/user(traveler)/trip-planning/vehicle.model";
import { BaseRepository } from "@/repositories/base.repository";
import { IVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/vehicle.repo.interface";

@injectable()
export class VehicleRepository extends BaseRepository<IVehicle> implements IVehicleRepository {
  constructor() {
    super(VehicleModel);
  }

  async findByOwnerId(ownerId: string): Promise<IVehicle[]> {
    return this.find({
      ownerId,
    });
  }

  async findByIdAndOwnerId(vehicleId: string, ownerId: string): Promise<IVehicle | null> {
    return this.findOne({
      _id: vehicleId,
      ownerId,
    });
  }
}
