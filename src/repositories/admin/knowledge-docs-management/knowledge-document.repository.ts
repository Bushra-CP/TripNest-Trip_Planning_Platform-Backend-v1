import {
  KnowledgeDocument,
  KnowledgeDocumentStatus,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import {
  IKnowledgeDocumentRepository,
  KnowledgeDocumentWithChunkCount,
} from "@/interfaces/IRepository/admin/knowledge-docs-management/IKnowledgeDocumentRepository";
import { KnowledgeDocumentModel } from "@/models/admin/knowledge-document.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import type { PipelineStage, QueryFilter } from "mongoose";

@injectable()
export class KnowledgeDocumentRepository
  extends BaseRepository<KnowledgeDocument>
  implements IKnowledgeDocumentRepository
{
  constructor() {
    super(KnowledgeDocumentModel);
  }

  public async findPaginatedWithChunkCount(
    page: number,
    limit: number,
    search?: string,
    status?: KnowledgeDocumentStatus,
  ): Promise<KnowledgeDocumentWithChunkCount[]> {
    const skip = (page - 1) * limit;

    const filter: QueryFilter<KnowledgeDocument> = {};

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      filter.$or = [
        {
          title: searchRegex,
        },
        {
          destination: searchRegex,
        },
        {
          category: searchRegex,
        },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: filter,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "knowledgechunks",
          localField: "_id",
          foreignField: "documentId",
          as: "chunks",
        },
      },
      {
        $addFields: {
          chunkCount: {
            $size: "$chunks",
          },
        },
      },
      {
        $project: {
          chunks: 0,
        },
      },
    ];

    return KnowledgeDocumentModel.aggregate<KnowledgeDocumentWithChunkCount>(pipeline).exec();
  }

  public async countWithFilters(
    search?: string,
    status?: KnowledgeDocumentStatus,
  ): Promise<number> {
    const filter: QueryFilter<KnowledgeDocument> = {};

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      filter.$or = [
        {
          title: searchRegex,
        },
        {
          destination: searchRegex,
        },
        {
          category: searchRegex,
        },
      ];
    }

    if (status) {
      filter.status = status;
    }

    return this.model.countDocuments(filter).exec();
  }
}
