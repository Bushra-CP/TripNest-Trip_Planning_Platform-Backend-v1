import mongoose, { Schema, Types } from "mongoose";

import type { ITripRoute } from "@/interfaces/IModel/trip-planning/ITripRoute";

const routeLocationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const routeLegSchema = new Schema(
  {
    distanceMeters: {
      type: Number,
      required: true,
    },

    durationSeconds: {
      type: Number,
      required: true,
    },

    startLocation: {
      type: routeLocationSchema,
      required: true,
    },

    endLocation: {
      type: routeLocationSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const tripRouteSchema = new Schema<ITripRoute>(
  {
    tripId: {
      type: Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },

    distanceMeters: {
      type: Number,
      required: true,
    },

    durationSeconds: {
      type: Number,
      required: true,
    },

    encodedPolyline: {
      type: String,
      default: null,
    },

    locations: {
      type: [routeLocationSchema],
      default: [],
    },

    legs: {
      type: [routeLegSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const TripRouteModel = mongoose.model<ITripRoute>("TripRoute", tripRouteSchema);
