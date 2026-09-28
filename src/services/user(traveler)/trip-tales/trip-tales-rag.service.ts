import { inject, injectable } from "inversify";

import { TYPES } from "@/di/types";

import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";

import { IPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";

import { IKnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";

import { IKnowledgeIngestionQueue } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";

@injectable()
export class TripTalesRagService {
  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeIngestionQueue)
    private readonly _knowledgeIngestionQueue: IKnowledgeIngestionQueue,
  ) {}

  public async addPostToKnowledge(post: IPost): Promise<IKnowledgeDocument> {
    const sourceContent = this.buildKnowledgeContent(post);

    const knowledgeDocument = await this._knowledgeDocumentRepository.create({
      title: post.title,

      description: `TripTales post about ${post.destination}`,

      destination: post.destination,

      category: "TRIP_TALES",

      fileType: "TRIP_TALES",

      fileKey: null,

      fileUrl: null,

      fileHash: null,

      status: "PENDING",

      uploadedBy: post.userId.toString(),

      sourceType: "TRIP_TALES",

      sourceId: post._id.toString(),

      sourceContent,
    });

    await this._knowledgeIngestionQueue.addJob({
      documentId: knowledgeDocument._id.toString(),
    });

    return knowledgeDocument;
  }

  /**
   * For preparing the post content as clean text to send to RAG pipeline.
   *
   * @private
   * @param {IPost} post
   * @return {*}  {string}
   * @memberof TripTalesRagService
   */
  private buildKnowledgeContent(post: IPost): string {
    const tags = post.tags.join(", ");

    const plainContent = this.getPlainText(post.content);

    return `
Title:
${post.title}

Destination:
${post.destination}

TripTales Content:
${plainContent}

Tags:
${tags}
`.trim();
  }

  private getPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }
}
