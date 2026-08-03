import { Document, Types } from "mongoose";

export interface ISocialPresence {
  url: string;
}

export interface ITravelerProfile extends Document {
  userId: Types.ObjectId;

  fullName: string;

  phone?: string;

  country: string;

  state: string;

  city: string;

  bio?: string;

  profileImageUrl?: string;

  profileImageKey?: string;

  socialPresence: ISocialPresence[];

  referenceId?: string;

  rewardPoints: number;

  createdAt: Date;

  updatedAt: Date;
}
