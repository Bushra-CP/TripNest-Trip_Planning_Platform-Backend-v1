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
  //Minimum semantic similarity score.
  private readonly minimumScore = 0.8;

  constructor(
    @inject(TYPES.DocumentEmbeddingService)
    private readonly _documentEmbeddingService: DocumentEmbeddingService,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: IKnowledgeChunkRepository,
  ) {}

  public async search(
    query: string,
    destination: string | null,
    limit = 5,
  ): Promise<KnowledgeChunkSearchResult[]> {
    if (!query.trim()) {
      throw new Error("Search query cannot be empty");
    }

    //Generate an embedding using the "query"
    const queryEmbedding = await this._documentEmbeddingService.generateQueryEmbedding(query);

    // Retrieve destination-aware candidates.
    const results = await this._knowledgeChunkRepository.searchSimilarChunks(
      queryEmbedding,
      destination,
      limit,
    );

    // Remove results that are below the minimum semantic similarity score.
    return results.filter((result) => result.score >= this.minimumScore);
  }
}
