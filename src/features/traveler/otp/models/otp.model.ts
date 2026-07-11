import mongoose, { Schema, Types } from "mongoose";
import type { IOtp } from "../interfaces/IOtp.js";

export const OtpSchema = new Schema<IOtp>(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const OtpModel = mongoose.model<IOtp>("Otp", OtpSchema);
