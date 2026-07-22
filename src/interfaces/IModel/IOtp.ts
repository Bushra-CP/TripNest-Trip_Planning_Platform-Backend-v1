import { Document, Types } from "mongoose";

export interface IOtp extends Document {
  userId: Types.ObjectId;

  email: string;

  otp: string;

  expiresAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
