import type {
  IPopulatedTripVehicle,
  ITripVehicle,
} from "@/interfaces/IModel/trip-planning/ITripVehicle";
import type { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface ITripVehicleRepository extends IBaseRepository<ITripVehicle> {
  findRawByTripId(tripId: string): Promise<ITripVehicle[]>;

  findByTripId(tripId: string): Promise<IPopulatedTripVehicle[]>;

  findByTripAndVehicle(tripId: string, vehicleId: string): Promise<ITripVehicle | null>;

  findByTripAndUser(tripId: string, userId: string): Promise<ITripVehicle | null>;

  findRawFinalSelectedByTripId(tripId: string): Promise<ITripVehicle | null>;

  findFinalSelectedByTripId(tripId: string): Promise<IPopulatedTripVehicle | null>;

  findByIdWithVehicle(tripVehicleId: string): Promise<IPopulatedTripVehicle | null>;
}
