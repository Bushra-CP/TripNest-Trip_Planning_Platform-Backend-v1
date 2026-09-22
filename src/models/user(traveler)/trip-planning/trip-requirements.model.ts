import mongoose, { Schema, Types } from "mongoose";

import type { ITripRequirements } from "@/interfaces/IModel/trip-planning/ITripRequirements";

const tripStopSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    days: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const tripRequirementsSchema = new Schema<ITripRequirements>(
  {
    tripId: {
      type: Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },

    source: {
      type: String,
      default: null,
    },

    destinations: {
      type: [tripStopSchema],
      default: [],
    },

    startDate: {
      type: String,
      default: null,
    },

    totalDays: {
      type: Number,
      default: null,
    },

    numberOfTravelers: {
      type: Number,
      default: null,
    },

    budget: {
      type: Number,
      default: null,
    },

    travelMode: {
      type: String,
      default: null,
    },

    tripType: {
      type: String,
      default: null,
    },

    preferences: {
      type: [String],
      default: [],
    },

    additionalDetails: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const TripRequirementsModel = mongoose.model<ITripRequirements>(
  "TripRequirements",
  tripRequirementsSchema,
);
