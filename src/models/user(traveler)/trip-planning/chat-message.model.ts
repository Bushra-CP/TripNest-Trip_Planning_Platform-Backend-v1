import mongoose, { Schema, Types } from "mongoose";

import type { IChatMessage } from "@/interfaces/IModel/trip-planning/IMessage";

const chatMessageSchema = new Schema<IChatMessage>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },

    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({
  roomId: 1,
  createdAt: 1,
});

export const ChatMessageModel = mongoose.model<IChatMessage>("Message", chatMessageSchema);
