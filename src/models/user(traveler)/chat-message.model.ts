import { IChatMessage } from "@/interfaces/IModel/IMessage";
import mongoose, { Schema, Types } from "mongoose";

const chatMessageSchema = new Schema<IChatMessage>(
  {
    roomId: {
      type: String,
      required: true,
    },

    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderName: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ChatMessageModel = mongoose.model<IChatMessage>("Message", chatMessageSchema);
