import { Document, Types } from "mongoose";

export interface IChatMessage extends Document {
  roomId: string;
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface IChatMessageWithSender extends IChatMessage {
  sender: {
    fullName: string;
    profileImageUrl: string;
  };
}
