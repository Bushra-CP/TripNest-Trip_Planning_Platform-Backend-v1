import { Document, Types } from "mongoose";

export type TripMemberRole = "OWNER" | "MEMBER" | "GUEST";

export interface ITripMember extends Document {
  tripId: Types.ObjectId;

  userId: Types.ObjectId;

  role: TripMemberRole;

  joinedAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
