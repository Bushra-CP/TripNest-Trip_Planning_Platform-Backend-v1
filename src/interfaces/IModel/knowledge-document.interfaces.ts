import { Document, Types } from "mongoose";

export type KnowledgeDocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type KnowledgeDocumentFileType = "PDF" | "DOCX" | "TXT";

export interface ChunkMetadata {
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

export interface KnowledgeDocument extends Document {
  title: string;
  description: string | null;
  destination: string | null;
  category: string;
  fileType: KnowledgeDocumentFileType;
  fileKey: string;
  fileUrl: string;
  fileHash: string;
  status: KnowledgeDocumentStatus;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk extends Document, ChunkMetadata {
  documentId: Types.ObjectId;
  content: string;
  destination: string | null;
  category: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}
