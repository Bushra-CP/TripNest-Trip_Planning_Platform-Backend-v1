import { Document, Types } from "mongoose";

export type TripMode = "solo" | "group";

export type TripStatus = "planning" | "ready" | "completed" | "cancelled";

export interface ITrip extends Document {
  ownerId: Types.ObjectId;

  title: string;

  tripMode: TripMode;

  status: TripStatus;

  threadId: string; //LangGraph conversation/checkpoint identity

  roomId: string | null; //Created when the trip is converted to group mode

  createdAt: Date;

  updatedAt: Date;
}
