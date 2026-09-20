import "reflect-metadata";

import { knowledgeIngestionQueue } from "./queues/knowledge-ingestion.queue";

/**
 * Adds a real knowledge document ingestion job
 * to the BullMQ queue.
 */
const testBullMQ = async (): Promise<void> => {
  // Add a knowledge document ingestion job
  const job = await knowledgeIngestionQueue.add("knowledge-document", {
    title: "Kerala Travel Guide",
    description: "Test travel knowledge document for Kerala",
    destination: "Kerala",
    category: "DESTINATION",
    fileType: "TXT",
    fileUrl: "test://kerala.txt",
    uploadedBy: "test-admin",
    filePath: "src/test-data/kerala.txt",
  });

  // Display the created job information
  console.log("Knowledge ingestion job added successfully.");
  console.log("Job ID:", job.id);
  console.log("Job name:", job.name);
  console.log("Job data:", job.data);

  // Close the queue connection after the test
  await knowledgeIngestionQueue.close();
};

testBullMQ().catch((error: unknown) => {
  console.error("BullMQ test failed:", error);
});
