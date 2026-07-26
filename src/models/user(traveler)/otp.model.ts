import mongoose, { Schema, Types } from "mongoose";
import { IOtp } from "../../interfaces/IModel/IOtp.js";

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
  },
  {
    timestamps: true,
  },
);

// Automatically delete documents 60 seconds after createdAt
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 });

export const OtpModel = mongoose.model<IOtp>("Otp", OtpSchema);