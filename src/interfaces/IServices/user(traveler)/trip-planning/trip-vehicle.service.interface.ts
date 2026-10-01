import type { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";

export interface ITripVehicleService {
  addVehicleToTrip(tripId: string, vehicleId: string, userId: string): Promise<ITripVehicle>;

  getTripVehicles(tripId: string): Promise<ITripVehicle[]>;

  getFinalSelectedVehicle(tripId: string): Promise<ITripVehicle | null>;

  removeVehicleFromTrip(tripId: string, vehicleId: string, userId: string): Promise<ITripVehicle>;

  voteForVehicle(tripId: string, tripVehicleId: string, userId: string): Promise<ITripVehicle>;

  removeVote(tripId: string, tripVehicleId: string, userId: string): Promise<ITripVehicle>;

  finalizeVehicle(tripId: string, tripVehicleId: string, userId: string): Promise<ITripVehicle>;
}
