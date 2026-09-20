import type { KnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";
import { IBaseRepository } from "../../IBaseRepository";

export interface KnowledgeDocumentWithChunkCount extends KnowledgeDocument {
  chunkCount: number;
}

export interface IKnowledgeDocumentRepository extends IBaseRepository<KnowledgeDocument> {
  findPaginatedWithChunkCount(
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ): Promise<KnowledgeDocumentWithChunkCount[]>;

  countWithFilters(search?: string, status?: string): Promise<number>;
}
