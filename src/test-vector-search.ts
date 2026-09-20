import "reflect-metadata";

import { container } from "./di";
import { TYPES } from "./di/types";
import { connectDB } from "./config/db";
import { KnowledgeVectorSearchService } from "./services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";

const testVectorSearch = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDB();

  // Get the vector search service from Inversify
  const vectorSearchService = container.get<KnowledgeVectorSearchService>(
    TYPES.KnowledgeVectorSearchService,
  );

  // User's natural-language question
  const query = "What are the best places to visit in Alappuzha?";

  // Search the knowledge base
  const results = await vectorSearchService.search(query, 5);

  console.log("\nQuery:", query);
  console.log("Number of results:", results.length);

  // Display the retrieved chunks
  results.forEach((result, index) => {
    console.log(`\n--- Result ${index + 1} ---`);
    console.log("Content:", result.content);
    console.log("Destination:", result.destination);
    console.log("Category:", result.category);
    console.log("Score:", result.score);
  });
};

testVectorSearch().catch((error: unknown) => {
  console.error("Vector search failed:", error);
});
