import { KnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";
import { Types } from "mongoose";

export interface KnowledgeChunkSearchResult {
  documentId: string;
  content: string;
  destination: string | null;
  places: string[];
  category: string;
  score: number;
}

export interface IKnowledgeChunkRepository extends IBaseRepository<KnowledgeChunk> {
  searchSimilarChunks(
    queryEmbedding: number[],
    destination: string | null,
    limit?: number,
  ): Promise<KnowledgeChunkSearchResult[]>;

  findChunksByDocument(documentId: Types.ObjectId): Promise<KnowledgeChunk[]>;

  deleteByDocumentId(documentId: Types.ObjectId): Promise<boolean>;
}
