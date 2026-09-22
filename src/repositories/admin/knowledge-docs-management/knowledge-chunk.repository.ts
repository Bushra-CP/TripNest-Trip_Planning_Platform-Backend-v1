import { injectable } from "inversify";
import { KnowledgeChunk } from "@/interfaces/IModel/knowledge-document.interfaces";
import { BaseRepository } from "@/repositories/base.repository";
import { KnowledgeChunkModel } from "@/models/admin/knowledge-chunk.model";
import {
  IKnowledgeChunkRepository,
  KnowledgeChunkSearchResult,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import { Types } from "mongoose";

@injectable()
export class KnowledgeChunkRepository
  extends BaseRepository<KnowledgeChunk>
  implements IKnowledgeChunkRepository
{
  constructor() {
    super(KnowledgeChunkModel);
  }

  /**
   * Search MongoDB for chunks similar to the query embedding
   *
   * @param {number[]} queryEmbedding
   * @param {number} [limit=5]
   * @return {*}  {Promise<KnowledgeChunkSearchResult[]>}
   * @memberof KnowledgeChunkRepository
   */
  public async searchSimilarChunks(
    queryEmbedding: number[],
    destination: string | null,
    limit = 5,
  ): Promise<KnowledgeChunkSearchResult[]> {
    const filter = destination
      ? {
          $or: [
            {
              destination: destination,
            },
            {
              places: destination,
            },
          ],
        }
      : undefined;

    const results = await this.model.aggregate<KnowledgeChunkSearchResult>([
      {
        $vectorSearch: {
          index: "TripNest-knowledge_chunks_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit,
          ...(filter && { filter }),
        },
      },
      {
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
      },
    ]);

    return results;
  }

  public async findChunksByDocument(documentId: Types.ObjectId): Promise<KnowledgeChunk[]> {
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
