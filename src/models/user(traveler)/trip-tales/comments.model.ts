import mongoose, { Schema } from "mongoose";
import { IComment } from "@/interfaces/IModel/trip-tales/comments.model.interface";

const commentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "TripTalesPosts",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "TripTalesComments",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

commentSchema.index({
  postId: 1,
  parentCommentId: 1,
  createdAt: -1,
});

export const CommentModel = mongoose.model<IComment>("TripTalesComments", commentSchema);
