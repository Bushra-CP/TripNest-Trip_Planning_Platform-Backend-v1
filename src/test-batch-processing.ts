import "reflect-metadata";

import { container } from "./di";
import { TYPES } from "./di/types";
import { BatchProcessingService } from "./services/admin/ai/rag/doc-chunk-processing/batch-processing.service";

const testBatchProcessing = (): void => {
  const batchService = container.get<BatchProcessingService>(TYPES.BatchProcessingService);

  const chunks = ["Chunk 1", "Chunk 2", "Chunk 3", "Chunk 4", "Chunk 5", "Chunk 6", "Chunk 7"];

  // Split chunks into batches of 3
  const batches = batchService.createBatches(chunks, 3);

  console.log("Number of batches:", batches.length);
  console.log("Batches:");
  console.log(JSON.stringify(batches, null, 2));
};

testBatchProcessing();
