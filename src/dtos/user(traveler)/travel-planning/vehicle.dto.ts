import type { VehicleType, FuelType } from "@/interfaces/IModel/trip-planning/IVehicle";

export interface CreateVehicleRequestDto {
  name: string;

  type: VehicleType;

  fuelType: FuelType;

  mileage: number;

  seatingCapacity: number;

  additionalDetails?: string;
}

export interface UpdateVehicleRequestDto {
  name?: string;

  type?: VehicleType;

  fuelType?: FuelType;

  mileage?: number;

  seatingCapacity?: number;

  additionalDetails?: string;
}
