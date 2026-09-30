import type { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";
import type { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface ITripVehicleRepository extends IBaseRepository<ITripVehicle> {
  findByTripId(tripId: string): Promise<ITripVehicle[]>;

  findByTripAndVehicle(tripId: string, vehicleId: string): Promise<ITripVehicle | null>;

  findSelectedByTripId(tripId: string): Promise<ITripVehicle | null>;
}
