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
    limit = 5,
  ): Promise<KnowledgeChunkSearchResult[]> {
    const results = await this.model.aggregate<KnowledgeChunkSearchResult>([
      {
        //mongoDB vector search
        $vectorSearch: {
          index: "TripNest-knowledge_chunks_vector_index", //name of vector search index
          path: "embedding", //field containing our 768-dimensional embeddings
          queryVector: queryEmbedding, //embedding generated from user's query
          numCandidates: 50, //number of candidates mongoDB considers
          limit, //number of final results we want
        },
      },
      {
        $project: {
          _id: 0,
          documentId: 1,
          content: 1,
          destination: 1,
          category: 1,
          score: {
            $meta: "vectorSearchScore", //similarity score given by mongoDB
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
