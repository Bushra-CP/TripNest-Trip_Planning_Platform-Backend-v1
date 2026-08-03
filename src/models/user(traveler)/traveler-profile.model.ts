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

    country: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    profileImageUrl: {
      type: String,
      default: "",
    },

    profileImageKey: {
      type: String,
      default: "",
    },

    socialPresence: {
      type: [
        {
          url: {
            type: String,
            trim: true,
            required: true,
          },
        },
      ],

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
