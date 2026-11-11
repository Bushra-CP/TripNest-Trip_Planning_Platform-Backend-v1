import mongoose, { Schema } from "mongoose";

import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

const postReportSchema = new Schema<IPostReport>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "TripTalesPosts",
      required: true,
    },

    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      enum: [
        "SPAM",
        "INAPPROPRIATE_CONTENT",
        "HARASSMENT",
        "HATE_SPEECH",
        "FALSE_INFORMATION",
        "COPYRIGHT_VIOLATION",
        "OTHER",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["PENDING", "REVIEWED", "RESOLVED", "REJECTED"],
      default: "PENDING",
    },

    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent the same user from reporting the same post multiple times.
postReportSchema.index({ postId: 1, reporterId: 1 }, { unique: true });

export const PostReportModel = mongoose.model<IPostReport>(
  "TripTalesPostReports",
  postReportSchema,
);
