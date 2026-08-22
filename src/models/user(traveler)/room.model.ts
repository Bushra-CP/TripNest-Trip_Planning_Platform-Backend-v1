import { IRoom } from "@/interfaces/IModel/IRoom";
import mongoose, { Schema, Types } from "mongoose";

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const RoomModel = mongoose.model<IRoom>("Room", roomSchema);
