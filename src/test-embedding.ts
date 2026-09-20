import "reflect-metadata";

import { container } from "./di";
import { TYPES } from "./di/types";
import { DocumentEmbeddingService } from "./services/admin/ai/rag/doc-chunk-processing/document-embedding.service";

const testEmbedding = async (): Promise<void> => {
  console.log("Starting Gemini batch embedding test...");

  const embeddingService = container.get<DocumentEmbeddingService>(TYPES.DocumentEmbeddingService);

  const chunks = [
    "Alappuzha is famous for its backwaters and houseboat cruises.",
    "Munnar is known for tea plantations, mountains, and cool weather.",
    "Wayanad offers waterfalls, wildlife, trekking, and scenic landscapes.",
    "Kovalam is a popular beach destination in Kerala.",
    "Thekkady is known for wildlife experiences and Periyar Lake.",
  ];

  console.log(`Number of chunks: ${chunks.length}`);

  const embeddings = await embeddingService.generateDocumentEmbeddings(chunks);

  console.log("Batch embedding generated successfully.");
  console.log("Number of embeddings:", embeddings.length);

  embeddings.forEach((embedding, index) => {
    console.log(`Embedding ${index + 1}: ${embedding.length} dimensions`);
  });

  console.log("\nFirst 5 values of first embedding:");
  console.log(embeddings[0]!.slice(0, 5));
};

testEmbedding().catch((error: unknown) => {
  console.error("Batch embedding test failed:", error);
});
