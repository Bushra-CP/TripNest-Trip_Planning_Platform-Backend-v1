import { Types } from "mongoose";

export interface IOtp {
  userId: Types.ObjectId;
  email: string;
  otp: string;
  createdAt: Date;
  updatedAt: Date;
}
