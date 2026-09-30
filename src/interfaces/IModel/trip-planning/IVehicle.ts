import { Document, Types } from "mongoose";

export type VehicleType =
  "CAR" | "BIKE" | "SUV" | "BUS" | "VAN" | "TRAVELLER" | "TAXI" | "AUTO" | "OTHER";

export type FuelType = "PETROL" | "DIESEL" | "ELECTRIC" | "CNG" | "OTHER";

export interface IVehicle extends Document {
  ownerId: Types.ObjectId;

  name: string;

  type: VehicleType;

  fuelType: FuelType;

  mileage: number;

  seatingCapacity: number;

  additionalDetails?: string;

  createdAt: Date;

  updatedAt: Date;
}
