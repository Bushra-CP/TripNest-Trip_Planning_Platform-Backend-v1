import { injectable } from "inversify";
import { PipelineStage, Types } from "mongoose";

import { IKnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import { BaseRepository } from "@/repositories/base.repository";
import { KnowledgeChunkModel } from "@/models/admin/knowledge-chunk.model";

import {
  IKnowledgeChunkRepository,
  KnowledgeChunkSearchResult,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import { KnowledgeMetadataFieldOrNull } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-query-classifier.service";

@injectable()
export class KnowledgeChunkRepository
  extends BaseRepository<IKnowledgeChunk>
  implements IKnowledgeChunkRepository
{
  constructor() {
    super(KnowledgeChunkModel);
  }

  public async searchSimilarChunks(
    queryEmbedding: number[],
    destination: string | null,
    metadataField: KnowledgeMetadataFieldOrNull,
    limit = 5,
  ): Promise<KnowledgeChunkSearchResult[]> {
    const candidateLimit = Math.max(limit * 10, 50);

    const pipeline: PipelineStage[] = [
      {
        $vectorSearch: {
          index: "TripNest-knowledge_chunks_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: candidateLimit,
        },
      },
    ];

    // Filter destination after vector search.
    if (destination) {
      pipeline.push({
        $match: {
          destination: {
            $regex: destination,
            $options: "i",
          },
        },
      });
    }

    // Filter using the selected metadata field.
    if (metadataField) {
      pipeline.push({
        $match: {
          [`${metadataField}.0`]: {
            $exists: true,
          },
        },
      });
    }

    pipeline.push({
      $project: {
        _id: 0,
        documentId: 1,
        content: 1,
        destination: 1,
        places: 1,
        category: 1,
        score: {
          $meta: "vectorSearchScore",
        },
      },
    });

    const results = await this.model.aggregate<KnowledgeChunkSearchResult>(pipeline);

    return results.slice(0, limit);
  }

  public async findChunksByDocument(documentId: Types.ObjectId): Promise<IKnowledgeChunk[]> {
    return this.find({
      documentId,
    });
  }

  public async deleteByDocumentId(documentId: Types.ObjectId): Promise<boolean> {
    const result = await this.model
      .deleteMany({
        documentId,
      })
      .exec();

    return result.deletedCount > 0;
  }
}
