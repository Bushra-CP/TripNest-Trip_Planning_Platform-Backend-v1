import mongoose, { Schema, Types } from "mongoose";

import type { IRoom } from "@/interfaces/IModel/trip-planning/IRoom";

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // tripId: {
    //   type: Types.ObjectId,
    //   ref: "Trip",
    //   required: true,
    //   unique: true,
    //   index: true,
    // },

    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const RoomModel = mongoose.model<IRoom>("Room", roomSchema);
