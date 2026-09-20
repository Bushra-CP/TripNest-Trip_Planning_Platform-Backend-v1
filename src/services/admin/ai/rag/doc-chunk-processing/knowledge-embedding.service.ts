import { TYPES } from "@/di/types";
import { injectable, inject } from "inversify";
import { DocumentEmbeddingService } from "./document-embedding.service";
import { BatchProcessingService } from "./batch-processing.service";
import { RetryService } from "./retry.service";

/**
 * To connect chunking with embeddings.
 * To take the chunks and generate an embedding for each chunk.
 *
 * Chunks are processed in batches so that we don't make
 * one Gemini API request for every single chunk.
 *
 * @export
 * @class KnowledgeEmbeddingService
 */
@injectable()
export class KnowledgeEmbeddingService {
  // Number of chunks sent to Gemini in one request.
  private readonly batchSize = 10;
  private readonly batchDelayMs = 10_000;

  constructor(
    @inject(TYPES.DocumentEmbeddingService)
    private readonly _documentEmbeddingService: DocumentEmbeddingService,

    @inject(TYPES.BatchProcessingService)
    private readonly _batchProcessingService: BatchProcessingService,

    @inject(TYPES.RetryService)
    private readonly _retryService: RetryService,
  ) {}

  public async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    if (chunks.length === 0) {
      throw new Error("Cannot generate embeddings for empty chunks");
    }

    const batches = this._batchProcessingService.createBatches(chunks, this.batchSize);

    const allEmbeddings: number[][] = [];

    console.log(`Total chunks: ${chunks.length}`);

    console.log(`Total embedding batches: ${batches.length}`);

    for (const [index, batch] of batches.entries()) {
      console.log(
        `Generating embeddings for batch ${index + 1}/${batches.length} ` +
          `(${batch.length} chunks)...`,
      );

      const batchEmbeddings = await this._retryService.execute(
        () => this._documentEmbeddingService.generateDocumentEmbeddings(batch),
        3,
        2_000,
      );

      allEmbeddings.push(...batchEmbeddings);

      console.log(`Embedding batch ${index + 1} completed.`);

      // Wait before sending the next request.
      // Normal delay between successful Gemini requests
      if (index < batches.length - 1) {
        console.log(`Waiting ${this.batchDelayMs / 1000}s before next embedding batch...`);

        await this.delay(this.batchDelayMs);
      }
    }

    if (allEmbeddings.length !== chunks.length) {
      throw new Error(
        `Expected ${chunks.length} embeddings, ` + `but received ${allEmbeddings.length}`,
      );
    }

    return allEmbeddings;
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
