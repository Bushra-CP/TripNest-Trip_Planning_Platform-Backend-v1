import { Document, Types } from "mongoose";

export type PostReportReason =
  | "SPAM"
  | "INAPPROPRIATE_CONTENT"
  | "HARASSMENT"
  | "HATE_SPEECH"
  | "FALSE_INFORMATION"
  | "COPYRIGHT_VIOLATION"
  | "OTHER";

export type PostReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "REJECTED";

export interface IPostReport extends Document {
  postId: Types.ObjectId;

  reporterId: Types.ObjectId;

  reason: PostReportReason;

  description?: string;

  status: PostReportStatus;

  reviewedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}
