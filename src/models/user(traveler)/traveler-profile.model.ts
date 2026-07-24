import mongoose, { Schema, Types } from "mongoose";
import { ITravelerProfile } from "../../interfaces/IModel/ITravelerPofile.js";

export const travelerProfileSchema = new Schema<ITravelerProfile>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    location: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    socialPresence: {
      type: [String],
      default: [],
    },

    referenceId: {
      type: String,
      default: "",
      trim: true,
    },

    rewardPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const TravelerProfileModel = mongoose.model<ITravelerProfile>(
  "TravelerProfile",
  travelerProfileSchema,
);
