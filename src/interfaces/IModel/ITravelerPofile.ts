import { Document, Types } from "mongoose";

export interface ITravelerProfile extends Document {
  userId: Types.ObjectId;

  fullName: string;
  phone?: string;

  location?: string;
  bio?: string;
  profileImage?: string;

  socialPresence: string[];

  referenceId?: string;

  rewardPoints: number;

  createdAt: Date;
  updatedAt: Date;
}