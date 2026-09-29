import { IKnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";
import { KnowledgeMetadataFieldOrNull } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-query-classifier.service";
import { Types } from "mongoose";

export interface KnowledgeChunkSearchResult {
  documentId: string;
  content: string;
  destination: string | null;
  places: string[];
  category: string;
  score: number;
}

export interface IKnowledgeChunkRepository extends IBaseRepository<IKnowledgeChunk> {
  searchSimilarChunks(
    queryEmbedding: number[],
    destination: string | null,
    metadataField: KnowledgeMetadataFieldOrNull,
    limit?: number,
  ): Promise<KnowledgeChunkSearchResult[]>;

  findChunksByDocument(documentId: Types.ObjectId): Promise<IKnowledgeChunk[]>;

  deleteByDocumentId(documentId: Types.ObjectId): Promise<boolean>;
}
