import { Document, Types } from "mongoose";
import { ITravelerProfile } from "../ITravelerPofile";

export interface IComment extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  parentCommentId: Types.ObjectId | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

//IPopulatedComment reuses all properties from IComment, removes
// the original userId type, and replaces it with a populated
// user object containing the user's ID and traveler profile
export interface IPopulatedComment extends Omit<IComment, "userId"> {
  userId: {
    _id: Types.ObjectId;
    travelerProfile?: ITravelerProfile;
  };
}
