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
      enum: [
        "CAR",
        "BIKE",
        "SUV",
        "BUS",
        "VAN",
        "TRAVELLER",
        "TAXI",
        "AUTO",
        "OTHER",
      ] satisfies VehicleType[],
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["PETROL", "DIESEL", "ELECTRIC", "OTHER"] satisfies FuelType[],
      required: true,
    },

    fuelEfficiency: {
      type: Number,
      required: true,
      min: 0,
    },

    seatingCapacity: {
      type: Number,
      required: true,
      min: 1,
    },

    additionalDetails: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  },
);

export const VehicleModel = mongoose.model<IVehicle>("Vehicle", vehicleSchema);
