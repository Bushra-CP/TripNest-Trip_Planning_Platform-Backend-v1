import { Document, Types } from "mongoose";

export interface ITripTalesLike extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPopulatedTripTalesLike extends Omit<ITripTalesLike, "userId"> {
  userId: {
    _id: Types.ObjectId;
    travelerProfile?: {
      fullName?: string;
      profileImageUrl?: string;
    };
  };
}
