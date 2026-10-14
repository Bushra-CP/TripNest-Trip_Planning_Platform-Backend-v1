import { injectable } from "inversify";
import { PipelineStage, Types } from "mongoose";
import {
  IItineraryChunkRepository,
  ItineraryChunkSearchResult,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-chunk-repo.interface";
import { BaseRepository } from "@/repositories/base.repository";
import { IItineraryChunk } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { ItineraryChunkModel } from "@/models/user(traveler)/trip-planning/itinerary/itinerary-chunk.model";

@injectable()
export class ItineraryChunkRepository
  extends BaseRepository<IItineraryChunk>
  implements IItineraryChunkRepository
{
  constructor() {
    super(ItineraryChunkModel);
  }

  public async searchSimilarChunks(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<ItineraryChunkSearchResult[]> {
    const candidateLimit = Math.max(limit * 10, 50);

    const pipeline: PipelineStage[] = [
      {
        $vectorSearch: {
          index: "TripNest-itinerary_chunks_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: candidateLimit,
          filter: {
            isActive: true,
          },
        },
      },
      {
        $project: {
          _id: 0,
          templateId: 1,
          version: 1,
          chunkIndex: 1,
          content: 1,
          metadata: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
      {
        $limit: limit,
      },
    ];

    return this.model.aggregate<ItineraryChunkSearchResult>(pipeline);
  }

  public async findChunksByTemplate(
    templateId: Types.ObjectId,
    version?: number,
  ): Promise<IItineraryChunk[]> {
    const filter: {
      templateId: Types.ObjectId;
      version?: number;
    } = {
      templateId,
    };

    if (version !== undefined) {
      filter.version = version;
    }

    return this.find(filter);
  }
}
