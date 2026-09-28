import { Document, Types } from "mongoose";

export type KnowledgeDocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type KnowledgeDocumentFileType = "PDF" | "DOCX" | "TXT" | "TRIP_TALES";

export type KnowledgeSourceType = "DOCUMENT" | "TRIP_TALES";

export interface IChunkMetadata {
  places: string[];
  attractions: string[];
  activities: string[];
  accommodation: string[];
  restaurants: string[];
  cuisine: string[];
  transportation: string[];
  events: string[];
  festivals: string[];
  weather: string[];
  bestTimeToVisit: string[];
  travelTips: string[];
  safety: string[];
  budget: string[];
  topics: string[];
}

export interface IKnowledgeDocument extends Document {
  title: string;
  description: string | null;
  destination: string | null;
  category: string;
  fileType: KnowledgeDocumentFileType;
  fileKey: string | null;
  fileUrl: string | null;
  fileHash: string | null;
  status: KnowledgeDocumentStatus;
  uploadedBy: string;
  sourceType: KnowledgeSourceType;
  sourceId: string | null;
  sourceContent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKnowledgeChunk extends Document, IChunkMetadata {
  documentId: Types.ObjectId;
  content: string;
  destination: string | null;
  category: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}
