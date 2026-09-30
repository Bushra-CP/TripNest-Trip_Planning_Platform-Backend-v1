import mongoose, { Schema, Types } from "mongoose";
import type { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";

const tripVehicleSchema = new Schema<ITripVehicle>(
  {
    tripId: {
      type: Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    vehicleId: {
      type: Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    addedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    selected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

tripVehicleSchema.index({ tripId: 1, vehicleId: 1 }, { unique: true });

export const TripVehicleModel = mongoose.model<ITripVehicle>("TripVehicle", tripVehicleSchema);
