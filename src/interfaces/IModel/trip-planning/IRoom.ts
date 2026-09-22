import { Document, Types } from "mongoose";

export interface IRoom extends Document {
  roomId: string;

  // tripId: Types.ObjectId;

  createdBy: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}
