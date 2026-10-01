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

    voters: {
      type: [Types.ObjectId],
      ref: "User",
      default: [],
    },

    finalSelected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

//Compound index - To make sure the same vehicle cannot be added to the same trip twice
tripVehicleSchema.index({ tripId: 1, vehicleId: 1 }, { unique: true });

export const TripVehicleModel = mongoose.model<ITripVehicle>("TripVehicle", tripVehicleSchema);
