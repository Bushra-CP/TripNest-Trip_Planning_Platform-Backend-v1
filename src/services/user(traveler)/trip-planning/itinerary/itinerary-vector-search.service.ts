import { TYPES } from "@/di/types";
import {
  IItineraryChunkRepository,
  ItineraryChunkSearchResult,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-chunk-repo.interface";
import { DocumentEmbeddingService } from "@/services/admin/ai/rag/doc-chunk-processing/document-embedding.service";
import { inject, injectable } from "inversify";

@injectable()
export class ItineraryVectorSearchService {
  constructor(
    @inject(TYPES.DocumentEmbeddingService)
    private readonly _documentEmbeddingService: DocumentEmbeddingService,

    @inject(TYPES.ItineraryChunkRepository)
    private readonly _itineraryChunkRepository: IItineraryChunkRepository,
  ) {}

  public async search(query: string, limit = 5): Promise<ItineraryChunkSearchResult[]> {
    if (!query.trim()) {
      throw new Error("Itinerary search query cannot be empty");
    }

    // Generate an embedding for the user's trip requirements.
    const queryEmbedding = await this._documentEmbeddingService.generateQueryEmbedding(query);

    // Search for similar itinerary chunks.
    return this._itineraryChunkRepository.searchSimilarChunks(queryEmbedding, limit);
  }
}
