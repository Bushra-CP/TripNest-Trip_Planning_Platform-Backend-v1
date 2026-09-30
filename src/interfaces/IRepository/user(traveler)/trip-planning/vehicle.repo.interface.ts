import type { IVehicle } from "@/interfaces/IModel/trip-planning/IVehicle";
import type { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface IVehicleRepository extends IBaseRepository<IVehicle> {
  findByOwnerId(ownerId: string): Promise<IVehicle[]>;

  findByIdAndOwnerId(vehicleId: string, ownerId: string): Promise<IVehicle | null>;
}
