import {
  IKnowledgeDocument,
  KnowledgeDocumentFileType,
  KnowledgeDocumentStatus,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import mongoose, { Schema, type Model } from "mongoose";

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    destination: {
      type: String,
      default: null,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      enum: [
        "PDF",
        "DOCX",
        "TXT",
        "TRIP_TALES",
        "AI_ACQUIRED",
      ] satisfies KnowledgeDocumentFileType[],
      required: true,
    },

    fileKey: {
      type: String,
      default: null,
      trim: true,
    },

    fileUrl: {
      type: String,
      default: null,
      trim: true,
    },

    fileHash: {
      // Used to prevent the same file from being ingested twice
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "READY", "FAILED"] satisfies KnowledgeDocumentStatus[],
      default: "PENDING",
    },

    uploadedBy: {
      type: String,
      required: true,
    },

    sourceType: {
      type: String,
      enum: ["DOCUMENT", "TRIP_TALES", "AI_ACQUIRED"],
      default: "DOCUMENT",
      required: true,
    },

    sourceId: {
      type: String,
      default: null,
    },

    sourceContent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const KnowledgeDocumentModel: Model<IKnowledgeDocument> = mongoose.model<IKnowledgeDocument>(
  "KnowledgeDocument",
  knowledgeDocumentSchema,
);
