import {
  CreateVehicleRequestDto,
  UpdateVehicleRequestDto,
} from "@/dtos/user(traveler)/travel-planning/vehicle.dto";
import type { IVehicle } from "@/interfaces/IModel/trip-planning/IVehicle";

export interface IVehicleService {
  createVehicle(ownerId: string, payload: CreateVehicleRequestDto): Promise<IVehicle>;

  getVehicles(ownerId: string): Promise<IVehicle[]>;

  getVehicleById(ownerId: string, vehicleId: string): Promise<IVehicle | null>;

  updateVehicle(
    ownerId: string,
    vehicleId: string,
    payload: UpdateVehicleRequestDto,
  ): Promise<IVehicle>;

  deleteVehicle(ownerId: string, vehicleId: string): Promise<IVehicle>;
}
