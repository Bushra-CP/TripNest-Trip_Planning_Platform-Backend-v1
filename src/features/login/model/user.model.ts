import { Schema } from "mongoose";
import type { IUserModel } from "../interfaces/user.model.interface.js";

const userSchema = new Schema<IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["traveler", "admin"],
      default: "traveler",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);
