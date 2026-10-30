import mongoose, { Schema } from "mongoose";
import { ITripTalesLike } from "@/interfaces/IModel/trip-tales/trip-tales-like.model.interface";

const tripTalesLikeSchema = new Schema<ITripTalesLike>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "TripTalesPosts",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One user can like a particular post only once.
tripTalesLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

// Useful for retrieving a post's likes in chronological order.
tripTalesLikeSchema.index({ postId: 1, createdAt: -1 });

export const TripTalesLikeModel = mongoose.model<ITripTalesLike>(
  "TripTalesLike",
  tripTalesLikeSchema,
);
