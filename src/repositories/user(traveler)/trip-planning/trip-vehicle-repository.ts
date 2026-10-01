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

  /**
   * To fetch all vehicles proposed for the trip
   *
   * @param {string} tripId
   * @return {*}  {Promise<ITripVehicle[]>}
   * @memberof TripVehicleRepository
   */
  async findByTripId(tripId: string): Promise<ITripVehicle[]> {
    return this.find({
      tripId,
    });
  }

  /**
   * To check whether a particular vehicle has already been added to the trip
   *
   * @param {string} tripId
   * @param {string} vehicleId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findByTripAndVehicle(tripId: string, vehicleId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      vehicleId,
    });
  }

  /**
   * To find the vehicle finally chosen
   *
   * @param {string} tripId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findFinalSelectedByTripId(tripId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      finalSelected: true,
    });
  }
}
