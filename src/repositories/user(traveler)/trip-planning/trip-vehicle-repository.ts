import {
  IPopulatedTripVehicle,
  ITripVehicle,
} from "@/interfaces/IModel/trip-planning/ITripVehicle";
import { IVehicle } from "@/interfaces/IModel/trip-planning/IVehicle";
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
   * findRawFinalSelectedByTripId
   *
   * @param {string} tripId
   * @return {*}  {Promise<ITripVehicle[]>}
   * @memberof TripVehicleRepository
   */
  async findRawByTripId(tripId: string): Promise<ITripVehicle[]> {
    return this.find({
      tripId,
    });
  }

  /**
   * To fetch all vehicles proposed for the trip
   *
   * @param {string} tripId
   * @return {*}  {Promise<ITripVehicle[]>}
   * @memberof TripVehicleRepository
   */
  async findByTripId(tripId: string): Promise<IPopulatedTripVehicle[]> {
    return TripVehicleModel.find({ tripId }).populate<{ vehicleId: IVehicle }>("vehicleId").exec();
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
   * Find by tripId and userId
   *
   * @param {string} tripId
   * @param {string} userId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findByTripAndUser(tripId: string, userId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      addedBy: userId,
    });
  }

  /**
   * findRawFinalSelectedByTripId
   *
   * @param {string} tripId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findRawFinalSelectedByTripId(tripId: string): Promise<ITripVehicle | null> {
    return this.findOne({
      tripId,
      finalSelected: true,
    });
  }

  /**
   * To find the vehicle finally chosen
   *
   * @param {string} tripId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findFinalSelectedByTripId(tripId: string): Promise<IPopulatedTripVehicle | null> {
    return TripVehicleModel.findOne({
      tripId,
      finalSelected: true,
    })
      .populate<{ vehicleId: IVehicle }>("vehicleId")
      .exec();
  }

  /**
   * findByIdWithVehicle
   *
   * @param {string} tripVehicleId
   * @return {*}  {(Promise<IPopulatedTripVehicle | null>)}
   * @memberof TripVehicleRepository
   */
  async findByIdWithVehicle(tripVehicleId: string): Promise<IPopulatedTripVehicle | null> {
    return TripVehicleModel.findById(tripVehicleId)
      .populate<{ vehicleId: IVehicle }>("vehicleId")
      .exec();
  }
}
