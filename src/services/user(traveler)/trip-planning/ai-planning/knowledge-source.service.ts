import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";

import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";

import type { RagSource } from "@/interfaces/trip-planning/ai-planning.interfaces";

@injectable()
export class KnowledgeSourceService {
  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,
  ) {}

  public async getSources(documentIds: string[]): Promise<RagSource[]> {
    const uniqueDocumentIds = [...new Set(documentIds)];

    const sourceMap = new Map<string, RagSource>();

    for (const documentId of uniqueDocumentIds) {
      const document = await this._knowledgeDocumentRepository.findById(documentId);

      if (!document) {
        continue;
      }

      if (document.sourceType !== "TRIP_TALES" || !document.sourceId) {
        continue;
      }

      const post = await this._postRepository.findById(document.sourceId);

      if (!post) {
        continue;
      }

      sourceMap.set(post._id.toString(), {
        documentId: document._id.toString(),
        postId: post._id.toString(),
        title: post.title,
        destination: post.destination,
        media: post.media.map((item) => ({
          type: item.type,
          url: item.url,
        })),
      });
    }

    return [...sourceMap.values()];
  }
}
