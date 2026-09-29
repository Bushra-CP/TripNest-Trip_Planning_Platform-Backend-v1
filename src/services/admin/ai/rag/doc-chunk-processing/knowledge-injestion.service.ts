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

/**
 * Main pipeline that converts a knowledge source
 * into searchable knowledge.
 *
 * @export
 * @class KnowledgeIngestionService
 */
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

      let text: string;

      if (document.sourceType === "TRIP_TALES") {
        //TripTales source content
        text = await this.processTripTalesContent(document);
      } else if (document.sourceType === "AI_ACQUIRED") {
        //AI_acquired knowledge
        text = await this.processAIacquiredContent(document);
      } else {
        //Normal knowledge document - PDF / DOCX / TXT
        text = await this.processNormalDocument(document);
      }

      if (!text.trim()) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.NO_TEXT_FOUND);
      }

      //to convert the document texts to chunks
      const chunks = await this._documentChunkingService.createChunks(text);

      //to convert chunks to embeddings
      const embeddings = await this._knowledgeEmbeddingService.generateEmbeddings(chunks);

      //Split chunks into batches
      const batches = this._batchProcessingService.createBatches(chunks, 5);

      // Store metadata for all chunks
      const allMetadata: IChunkMetadata[] = [];

      console.log(`Total chunks: ${chunks.length}`);
      console.log(`Total batches: ${batches.length}`);

      //Process each batch.
      //One batch = ONE Groq call.
      for (const [index, batch] of batches.entries()) {
        console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} chunks`);

        // Extract metadata for the complete batch using one Groq call
        const batchMetadata = await this._retryService.execute(
          () => this._metadataExtractionService.extractMetadata(batch),
          3,
          2_000,
        );

        // Add the batch metadata to the complete metadata array.
        allMetadata.push(...batchMetadata);

        console.log(`Batch ${index + 1} completed. Metadata received: ${batchMetadata.length}`);

        // Wait before processing the next batch
        if (index < batches.length - 1) {
          await this.delay(this.batchDelayMs);
        }
      }

      // Make sure metadata exists for every chunk
      if (allMetadata.length !== chunks.length) {
        throw new Error(
          `Metadata count (${allMetadata.length}) ` +
            `does not match chunk count (${chunks.length})`,
        );
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

          // Add LLM-generated metadata
          ...metadata,

          embedding,
        });
      }

      //save chunkDocuments
      await this._knowledgeChunkRepository.insertMany(chunkDocuments);

      ////to update document status to READY
      const updatedDocument = await this._knowledgeDocumentRepository.updateById(
        documentId.toString(),
        {
          status: "READY",
        },
      );

      if (!updatedDocument) {
        throw new Error("Knowledge document not found after processing");
      }

      return updatedDocument;
    } catch (error) {
      //in case of error - update document status to FAILED
      await this._knowledgeDocumentRepository.updateById(documentId.toString(), {
        status: "FAILED",
      });

      throw error;
    }
  }

  /**
   * Process a normal knowledge document - PDF / DOCX / TXT
   *
   * @private
   * @param {IKnowledgeDocument} document
   * @return {*}  {Promise<string>}
   * @memberof KnowledgeIngestionService
   */
  private async processNormalDocument(document: IKnowledgeDocument): Promise<string> {
    if (!document.fileKey) {
      throw new Error("Knowledge document file key not found.");
    }

    // Download the original file from S3
    const fileBuffer = await this._s3Service.downloadFile(document.fileKey);

    // Extract text from PDF / DOCX / TXT
    return this._documentTextExtractionService.extractText(fileBuffer, document.fileType);
  }

  /**
   * Process a TripTales post.
   * It combines:
   * 1. Post text
   * 2. Image descriptions
   * 3. Video descriptions
   *
   * @private
   * @param {IKnowledgeDocument} document
   * @return {*}  {Promise<string>}
   * @memberof KnowledgeIngestionService
   */
  private async processTripTalesContent(document: IKnowledgeDocument): Promise<string> {
    // sourceId contains the TripTales post ID.
    if (!document.sourceId) {
      throw new Error("TripTales source ID not found.");
    }

    // Get the original TripTales post.
    const post = await this._postRepository.findById(document.sourceId);

    if (!post) {
      throw new Error(`TripTales post not found: ${document.sourceId}`);
    }

    //Store all pieces of knowledge here.
    const contentParts: string[] = [];

    //Add the original post text.
    if (document.sourceContent) {
      contentParts.push(document.sourceContent);
    }

    //Process every image/video attached to the TripTales post.
    for (const media of post.media) {
      try {
        //Download the image/video from S3.
        const mediaBuffer = await this._s3Service.downloadFile(media.key);

        //Find the MIME type from the file extension.
        const mimeType = this.getMediaMimeType(media.type, media.key);

        let description = "";

        //Send image to Gemini.
        if (media.type === "image") {
          description = await this._mediaUnderstandingService.describeImage(mediaBuffer, mimeType);
          console.log("image description:", description);
        }

        //Send video to Gemini.
        if (media.type === "video") {
          description = await this._mediaUnderstandingService.describeVideo(mediaBuffer, mimeType);
          console.log("video description:", description);
        }

        //Add the Gemini-generated description to the knowledge text.
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
        // If one media file fails, don't fail the entire TripTales post.
        // The text and other media can still be added to RAG.
        console.error(`Failed to process TripTales ${media.type}: ${media.key}`, error);
      }
    }

    //Combine post text + image descriptions + video descriptions into one string.
    return contentParts.join("\n\n");
  }

  /**
   * processAIacquiredContent
   *
   * @private
   * @param {IKnowledgeDocument} document
   * @return {*}  {Promise<string>}
   * @memberof KnowledgeIngestionService
   */
  private async processAIacquiredContent(document: IKnowledgeDocument): Promise<string> {
    if (!document.sourceContent?.trim()) {
      throw new Error("AI acquired knowledge content not found.");
    }

    return document.sourceContent.trim();
  }

  /**
   * To get the MIME type from the media type and S3 file key.
   *
   * @private
   * @param {("image" | "video")} type
   * @param {string} key
   * @return {*}  {string}
   * @memberof KnowledgeIngestionService
   */
  private getMediaMimeType(type: "image" | "video", key: string): string {
    //Get file extension.
    const extension = key.split(".").pop()?.toLowerCase();

    //Image MIME types.
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

    // Video MIME types.
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

  /**
   * To wait for the given amount of time.
   *
   * @private
   * @param {number} milliseconds
   * @return {*}  {Promise<void>}
   * @memberof KnowledgeIngestionService
   */
  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
