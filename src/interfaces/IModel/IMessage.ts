import { Document, Types } from "mongoose";

export interface IChatMessage extends Document {
  roomId: string;
  senderId: Types.ObjectId;
  senderName: string;
  message: string;
  createdAt: Date;
}
