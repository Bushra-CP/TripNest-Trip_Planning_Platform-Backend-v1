import {
  KnowledgeDocument,
  KnowledgeDocumentFileType,
  KnowledgeDocumentStatus,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import mongoose, { Schema, type Model } from "mongoose";

const knowledgeDocumentSchema = new Schema<KnowledgeDocument>(
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
      enum: ["PDF", "DOCX", "TXT"] satisfies KnowledgeDocumentFileType[],
      required: true,
    },

    fileKey: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    fileHash: {
      // Used to prevent the same file from being ingested twice
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true,
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
  },
  {
    timestamps: true,
  },
);

export const KnowledgeDocumentModel: Model<KnowledgeDocument> = mongoose.model<KnowledgeDocument>(
  "KnowledgeDocument",
  knowledgeDocumentSchema,
);
