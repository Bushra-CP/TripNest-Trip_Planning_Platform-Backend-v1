import "reflect-metadata";

import { container } from "./di";
import { TYPES } from "./di/types";
import { connectDB } from "./config/db";
import { KnowledgeIngestionWorker } from "./workers/knowledge-ingestion.worker";

/**
 * Starts the knowledge ingestion worker.
 */
const startWorker = async (): Promise<void> => {
  // Connect to MongoDB before processing jobs.
  await connectDB();

  // Get the worker instance from the DI container.
  //
  // Inversify will inject all required
  // dependencies into the worker.
  container.get<KnowledgeIngestionWorker>(TYPES.KnowledgeIngestionWorker);

  console.log("Knowledge ingestion worker started.");
};

startWorker().catch((error: unknown) => {
  console.error("Failed to start knowledge ingestion worker:", error);
});
