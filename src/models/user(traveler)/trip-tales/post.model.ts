import { IPost, IPostMedia } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import mongoose, { Schema } from "mongoose";

const postMediaSchema = new Schema<IPostMedia>(
  {
    key: {
      type: String,
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  {
    _id: false,
  },
);

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    media: {
      type: [postMediaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const PostModel = mongoose.model<IPost>("TripTalesPosts", postSchema);
