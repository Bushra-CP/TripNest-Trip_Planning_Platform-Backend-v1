import { KnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";
import { Types } from "mongoose";

export interface KnowledgeChunkSearchResult {
  documentId: string;
  content: string;
  destination: string | null;
  category: string;
  score: number;
}

export interface IKnowledgeChunkRepository extends IBaseRepository<KnowledgeChunk> {
  searchSimilarChunks(
    queryEmbedding: number[],
    limit?: number,
  ): Promise<KnowledgeChunkSearchResult[]>;

  findChunksByDocument(documentId: Types.ObjectId): Promise<KnowledgeChunk[]>;

  deleteByDocumentId(documentId: Types.ObjectId): Promise<boolean>;
}
