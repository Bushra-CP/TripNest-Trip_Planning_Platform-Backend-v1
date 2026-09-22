import mongoose, { Schema, Types } from "mongoose";
import type { ITrip } from "@/interfaces/IModel/trip-planning/ITrip";

const tripSchema = new Schema<ITrip>(
  {
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      default: null,
    },

    tripMode: {
      type: String,
      enum: ["solo", "group"],
      required: true,
      default: "solo",
    },

    status: {
      type: String,
      enum: ["planning", "ready", "completed", "cancelled"],
      required: true,
      default: "planning",
    },

    threadId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    roomId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const TripModel = mongoose.model<ITrip>("Trip", tripSchema);
