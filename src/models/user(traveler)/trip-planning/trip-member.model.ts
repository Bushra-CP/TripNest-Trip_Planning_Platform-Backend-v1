import mongoose, { Schema, Types } from "mongoose";

import type { ITripMember } from "@/interfaces/IModel/trip-planning/ITripMember";

const tripMemberSchema = new Schema<ITripMember>(
  {
    tripId: {
      type: Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["OWNER", "MEMBER", "GUEST"],
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

//A user should not have two active membership records for the same trip.
tripMemberSchema.index(
  {
    tripId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

export const TripMemberModel = mongoose.model<ITripMember>("TripMember", tripMemberSchema);
