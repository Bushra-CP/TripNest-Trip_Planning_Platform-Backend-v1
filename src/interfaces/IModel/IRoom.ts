import { Document, Types } from "mongoose";

export interface IRoom extends Document {
  roomId: string;
  createdBy: Types.ObjectId;
}
