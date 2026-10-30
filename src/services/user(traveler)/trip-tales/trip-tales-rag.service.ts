import { inject, injectable } from "inversify";

import { TYPES } from "@/di/types";

import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";

import { IPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";

import { IKnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";

import { IKnowledgeIngestionQueue } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";

@injectable()
export class TripTalesRagService {
  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeIngestionQueue)
    private readonly _knowledgeIngestionQueue: IKnowledgeIngestionQueue,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: KnowledgeChunkRepository,
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

  public async updatePostKnowledge(post: IPost): Promise<void> {
    const postId = post._id.toString();

    const existingDocument = await this._knowledgeDocumentRepository.findBySource(
      "TRIP_TALES",
      postId,
    );

    if (!existingDocument) {
      // If an older post has no knowledge document, create one using the existing implementation.
      await this.addPostToKnowledge(post);
      return;
    }

    // Immediately prevent old chunks from being retrieved.
    await this._knowledgeChunkRepository.setRetrievableByDocumentId(existingDocument._id, false);

    // Update the existing knowledge document.
    const updatedDocument = await this._knowledgeDocumentRepository.updateById(
      existingDocument._id.toString(),
      {
        title: post.title,
        description: `TripTales post about ${post.destination}`,
        destination: post.destination,
        sourceContent: this.buildKnowledgeContent(post),
        status: "PENDING",
      },
    );

    if (!updatedDocument) {
      throw new Error("Failed to update TripTales knowledge document");
    }

    // Queue updated content for ingestion.
    await this._knowledgeIngestionQueue.addJob({
      documentId: existingDocument._id.toString(),
    });
  }

  public async removePostKnowledge(postId: string): Promise<void> {
    const document = await this._knowledgeDocumentRepository.findBySource("TRIP_TALES", postId);

    if (!document) {
      return;
    }

    const documentId = document._id;

    // Make existing chunks unavailable immediately.
    await this._knowledgeChunkRepository.setRetrievableByDocumentId(documentId, false);

    // Delete all chunks associated with this document.
    await this._knowledgeChunkRepository.deleteByDocumentId(documentId);

    // Delete the knowledge document.
    await this._knowledgeDocumentRepository.deleteById(documentId.toString());
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
