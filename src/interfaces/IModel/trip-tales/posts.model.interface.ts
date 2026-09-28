import { Document, Types } from "mongoose";
import { ITravelerProfile } from "../ITravelerPofile";

export type PostMediaType = "image" | "video";

export interface IPostMedia {
  key: string;
  url: string;
  type: PostMediaType;
}

// User data returned when a post is populated.
export interface IPopulatedPostUser {
  _id: Types.ObjectId;
  travelerProfile?: ITravelerProfile;
}

// Post data returned with populated user information.
export interface IPopulatedPost extends Omit<IPost, "userId"> {
  userId: IPopulatedPostUser;
}

export interface IPost extends Document {
  userId: Types.ObjectId;

  title: string;

  destination: string;

  content: string;

  tags: string[];

  media: IPostMedia[];

  createdAt: Date;

  updatedAt: Date;
}
