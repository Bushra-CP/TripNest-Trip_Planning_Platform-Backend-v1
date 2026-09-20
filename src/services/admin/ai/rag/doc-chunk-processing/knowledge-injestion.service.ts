import { TYPES } from "@/di/types";
import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";
import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";
import { inject, injectable } from "inversify";
import { DocumentTextExtractionService } from "./document-text-extraction.service";
import { DocumentChunkingService } from "./document-chunking.service";
import type {
  ChunkMetadata,
  KnowledgeDocument,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import { ChunkMetadataExtractionService } from "./chunk-metadata-extraction.service";
import { KnowledgeEmbeddingService } from "./knowledge-embedding.service";
import { BatchProcessingService } from "./batch-processing.service";
import { RetryService } from "./retry.service";
import { IS3Service } from "@/infrastructure/s3/IS3Service";

/**
 * Main pipeline that converts an uploaded travel document
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
  ) {}

  public async processDocument(documentId: string): Promise<KnowledgeDocument> {
    const document = await this._knowledgeDocumentRepository.findById(documentId);

    if (!document) {
      throw new Error("Knowledge document not found.");
    }

    try {
      await this._knowledgeDocumentRepository.updateById(documentId, {
        status: "PROCESSING",
      });

      const fileBuffer = await this._s3Service.downloadFile(document.fileKey);

      const text = await this._documentTextExtractionService.extractText(
        fileBuffer,
        document.fileType,
      );

      //to convert the document texts to chunks
      const chunks = await this._documentChunkingService.createChunks(text);

      //to convert chunks to embeddings
      const embeddings = await this._knowledgeEmbeddingService.generateEmbeddings(chunks);

      //Split chunks into batches
      const batches = this._batchProcessingService.createBatches(chunks, 5);

      // Store metadata for all chunks
      const allMetadata: ChunkMetadata[] = [];

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
   * Waits for the given amount of time.
   */
  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
