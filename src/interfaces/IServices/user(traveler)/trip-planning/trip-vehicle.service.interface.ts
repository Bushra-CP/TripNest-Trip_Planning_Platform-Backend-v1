import type { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";
import { TripVehicleResponse } from "@/mapper/trip-vehicle.mapper";

export interface ITripVehicleService {
  addVehicleToTrip(tripId: string, vehicleId: string, userId: string): Promise<TripVehicleResponse>;

  getTripVehicles(tripId: string): Promise<TripVehicleResponse[]>;

  getFinalSelectedVehicle(tripId: string): Promise<TripVehicleResponse | null>;

  removeVehicleFromTrip(tripId: string, vehicleId: string, userId: string): Promise<ITripVehicle>;

  voteForVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse>;

  removeVote(tripId: string, tripVehicleId: string, userId: string): Promise<TripVehicleResponse>;

  finalizeVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse>;

  unfinalizeVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse>;
}
