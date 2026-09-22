import mongoose, { Schema, Types } from "mongoose";

import type { IVehicle, VehicleType, FuelType } from "@/interfaces/IModel/trip-planning/IVehicle";

const vehicleSchema = new Schema<IVehicle>(
  {
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["CAR", "BIKE", "SUV", "OTHER"] satisfies VehicleType[],
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["PETROL", "DIESEL", "ELECTRIC", "CNG", "OTHER"] satisfies FuelType[],
      required: true,
    },

    mileage: {
      type: Number,
      required: true,
      min: 0,
    },

    fuelPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const VehicleModel = mongoose.model<IVehicle>("Vehicle", vehicleSchema);
