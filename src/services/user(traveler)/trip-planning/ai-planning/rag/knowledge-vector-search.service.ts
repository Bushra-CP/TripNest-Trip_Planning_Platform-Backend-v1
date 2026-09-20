import { TYPES } from "@/di/types";
import {
  IKnowledgeChunkRepository,
  KnowledgeChunkSearchResult,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import { DocumentEmbeddingService } from "@/services/admin/ai/rag/doc-chunk-processing/document-embedding.service";
import { inject, injectable } from "inversify";

/**
 * Convert the user's question into an embedding and search for similar chunks
 *
 * @export
 * @class KnowledgeVectorSearchService
 */
@injectable()
export class KnowledgeVectorSearchService {
  constructor(
    @inject(TYPES.DocumentEmbeddingService)
    private readonly embeddingService: DocumentEmbeddingService,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly knowledgeChunkRepository: IKnowledgeChunkRepository,
  ) {}

  public async search(query: string, limit = 5): Promise<KnowledgeChunkSearchResult[]> {
    if (!query.trim()) {
      throw new Error("Search query cannot be empty");
    }

    //Generate an embedding using the "query"
    const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);

    // Search MongoDB for semantically similar knowledge chunks
    return this.knowledgeChunkRepository.searchSimilarChunks(queryEmbedding, limit);
  }
}
