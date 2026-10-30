import { TYPES } from "@/di/types";

import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";
import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";

import { inject, injectable } from "inversify";

import { DocumentTextExtractionService } from "./document-text-extraction.service";
import { DocumentChunkingService } from "./document-chunking.service";

import type {
  IChunkMetadata,
  IKnowledgeDocument,
} from "@/interfaces/IModel/knowledge-document.interfaces";

import { ChunkMetadataExtractionService } from "./chunk-metadata-extraction.service";
import { KnowledgeEmbeddingService } from "./knowledge-embedding.service";
import { BatchProcessingService } from "./batch-processing.service";
import { RetryService } from "./retry.service";

import { IS3Service } from "@/infrastructure/s3/IS3Service";

import { TripTalesMediaUnderstandingService } from "@/services/user(traveler)/trip-tales/trip-tales-media-understanding.service";

import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";

@injectable()
export class KnowledgeIngestionService {
  private readonly batchDelayMs = 20_000;

  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: KnowledgeChunkRepository,

    @inject(TYPES.DocumentTextExtractionService)
    private readonly _documentTextExtractionService: DocumentTextExtractionService,

    @inject(TYPES.DocumentChunkingService)
    private readonly _documentChunkingService: DocumentChunkingService,

    @inject(TYPES.KnowledgeEmbeddingService)
    private readonly _knowledgeEmbeddingService: KnowledgeEmbeddingService,

    @inject(TYPES.ChunkMetadataExtractionService)
    private readonly _metadataExtractionService: ChunkMetadataExtractionService,

    @inject(TYPES.BatchProcessingService)
    private readonly _batchProcessingService: BatchProcessingService,

    @inject(TYPES.RetryService)
    private readonly _retryService: RetryService,

    @inject(TYPES.S3Service)
    private readonly _s3Service: IS3Service,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,

    @inject(TYPES.TripTalesMediaUnderstandingService)
    private readonly _mediaUnderstandingService: TripTalesMediaUnderstandingService,
  ) {}

  public async processDocument(documentId: string): Promise<IKnowledgeDocument> {
    const document = await this._knowledgeDocumentRepository.findById(documentId);

    if (!document) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.KNOWLEDGE_DOCUMENT_NOT_FOUND);
    }

    try {
      await this._knowledgeDocumentRepository.updateById(documentId, {
        status: "PROCESSING",
      });

      // Check moderation before starting TripTales ingestion.
      const initialRetrievable = await this.isDocumentRetrievable(document);

      // Extract the source content.
      let text: string;

      if (document.sourceType === "TRIP_TALES") {
        text = await this.processTripTalesContent(document);
      } else if (document.sourceType === "AI_ACQUIRED") {
        text = await this.processAIacquiredContent(document);
      } else {
        text = await this.processNormalDocument(document);
      }

      if (!text.trim()) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.NO_TEXT_FOUND);
      }

      // Split text into chunks.
      const chunks = await this._documentChunkingService.createChunks(text);

      // Generate embeddings.
      const embeddings = await this._knowledgeEmbeddingService.generateEmbeddings(chunks);

      // Split chunks into batches.
      const batches = this._batchProcessingService.createBatches(chunks, 5);

      // Store metadata for every chunk.
      const allMetadata: IChunkMetadata[] = [];

      console.log(`Total chunks: ${chunks.length}`);
      console.log(`Total batches: ${batches.length}`);

      for (const [index, batch] of batches.entries()) {
        console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} chunks`);

        const batchMetadata = await this._retryService.execute(
          () => this._metadataExtractionService.extractMetadata(batch),
          3,
          2_000,
        );

        allMetadata.push(...batchMetadata);

        console.log(`Batch ${index + 1} completed. Metadata received: ${batchMetadata.length}`);

        if (index < batches.length - 1) {
          await this.delay(this.batchDelayMs);
        }
      }

      // Validate metadata count.
      if (allMetadata.length !== chunks.length) {
        throw new Error(
          `Metadata count (${allMetadata.length}) does not match chunk count (${chunks.length})`,
        );
      }

      // Determine initial retrieval eligibility.
      let isRetrievable = initialRetrievable;

      // Recheck moderation immediately before preparing chunks.
      if (document.sourceType === "TRIP_TALES") {
        isRetrievable = await this.isDocumentRetrievable(document);
      }

      const chunkDocuments = [];

      for (const [index, chunk] of chunks.entries()) {
        const embedding = embeddings[index];
        const metadata = allMetadata[index];

        if (!embedding) {
          throw new Error(`Embedding not found for chunk ${index}`);
        }

        if (!metadata) {
          throw new Error(`Metadata not found for chunk ${index}`);
        }

        chunkDocuments.push({
          documentId: document._id,
          content: chunk,
          destination: document.destination ?? null,
          category: document.category,

          ...metadata,

          embedding,

          // Blocked TripTales posts cannot become retrievable
          // simply because their queued job completed.
          isRetrievable,
        });
      }

      // Save the chunks.
      await this._knowledgeChunkRepository.insertMany(chunkDocuments);

      // Update the document processing status.
      const updatedDocument = await this._knowledgeDocumentRepository.updateById(documentId, {
        status: "READY",
      });

      if (!updatedDocument) {
        throw new Error("Knowledge document not found after processing");
      }

      return updatedDocument;
    } catch (error) {
      await this._knowledgeDocumentRepository.updateById(documentId, {
        status: "FAILED",
      });

      throw error;
    }
  }

  /**
   * Determine whether a knowledge document is eligible for retrieval.
   *
   * Non-TripTales knowledge remains retrievable.
   * TripTales knowledge is retrievable only when its source post is published.
   */
  private async isDocumentRetrievable(document: IKnowledgeDocument): Promise<boolean> {
    if (document.sourceType !== "TRIP_TALES") {
      return true;
    }

    if (!document.sourceId) {
      return false;
    }

    const post = await this._postRepository.findById(document.sourceId);

    if (!post) {
      return false;
    }

    return post.status === "PUBLISHED";
  }

  private async processNormalDocument(document: IKnowledgeDocument): Promise<string> {
    if (!document.fileKey) {
      throw new Error("Knowledge document file key not found.");
    }

    const fileBuffer = await this._s3Service.downloadFile(document.fileKey);

    return this._documentTextExtractionService.extractText(fileBuffer, document.fileType);
  }

  private async processTripTalesContent(document: IKnowledgeDocument): Promise<string> {
    if (!document.sourceId) {
      throw new Error("TripTales source ID not found.");
    }

    const post = await this._postRepository.findById(document.sourceId);

    if (!post) {
      throw new Error(`TripTales post not found: ${document.sourceId}`);
    }

    const contentParts: string[] = [];

    if (document.sourceContent) {
      contentParts.push(document.sourceContent);
    }

    for (const media of post.media) {
      try {
        const mediaBuffer = await this._s3Service.downloadFile(media.key);

        const mimeType = this.getMediaMimeType(media.type, media.key);

        let description = "";

        if (media.type === "image") {
          description = await this._mediaUnderstandingService.describeImage(mediaBuffer, mimeType);

          console.log("image description:", description);
        }

        if (media.type === "video") {
          description = await this._mediaUnderstandingService.describeVideo(mediaBuffer, mimeType);

          console.log("video description:", description);
        }

        if (description) {
          contentParts.push(
            `
Media Type:
${media.type}

Media Description:
${description}
            `.trim(),
          );
        }
      } catch (error) {
        console.error(`Failed to process TripTales ${media.type}: ${media.key}`, error);
      }
    }

    return contentParts.join("\n\n");
  }

  private async processAIacquiredContent(document: IKnowledgeDocument): Promise<string> {
    if (!document.sourceContent?.trim()) {
      throw new Error("AI acquired knowledge content not found.");
    }

    return document.sourceContent.trim();
  }

  private getMediaMimeType(type: "image" | "video", key: string): string {
    const extension = key.split(".").pop()?.toLowerCase();

    if (type === "image") {
      switch (extension) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";

        case "png":
          return "image/png";

        case "webp":
          return "image/webp";

        default:
          return "image/jpeg";
      }
    }

    switch (extension) {
      case "mp4":
        return "video/mp4";

      case "webm":
        return "video/webm";

      case "mov":
        return "video/quicktime";

      default:
        return "video/mp4";
    }
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
