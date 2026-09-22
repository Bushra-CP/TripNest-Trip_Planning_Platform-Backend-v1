import { Document, Types } from "mongoose";

export type VehicleType = "CAR" | "BIKE" | "SUV" | "OTHER";

export type FuelType = "PETROL" | "DIESEL" | "ELECTRIC" | "CNG" | "OTHER";

export interface IVehicle extends Document {
  ownerId: Types.ObjectId;

  name: string;

  type: VehicleType;

  fuelType: FuelType;

  mileage: number;

  fuelPrice: number;

  createdAt: Date;

  updatedAt: Date;
}
