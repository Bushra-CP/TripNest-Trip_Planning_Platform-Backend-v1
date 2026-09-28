import "reflect-metadata";
import mongoose from "mongoose";
import { TYPES } from "@/di/types";
import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";
import { container } from "./di";
import { DocumentEmbeddingService } from "./services/admin/ai/rag/doc-chunk-processing/document-embedding.service";
import { connectDB } from "./config/db";
import { KnowledgeQueryClassifierService } from "./services/user(traveler)/trip-planning/ai-planning/rag/knowledge-query-classifier.service";

const knowledgeChunkRepository = container.get<KnowledgeChunkRepository>(
  TYPES.KnowledgeChunkRepository,
);

const documentEmbeddingService = container.get<DocumentEmbeddingService>(
  TYPES.DocumentEmbeddingService,
);

const knowledgeQueryClassifierService = container.get<KnowledgeQueryClassifierService>(
  TYPES.KnowledgeQueryClassifierService,
);

const queries = [
  "What food is visibly shown in the photograph from my Udaipur trip?",
  "Describe the food visible in the uploaded image from my Udaipur trip.",
];

async function testRetrieval(): Promise<void> {
  try {
    await connectDB();

    // ========================================
    // PART 1: VECTOR SEARCH TEST
    // ========================================

    for (const query of queries) {
      console.log("\n========================================");
      console.log(`QUERY: ${query}`);
      console.log("========================================");

      const metadataField = await knowledgeQueryClassifierService.classify(query);

      console.log(`Metadata Field: ${metadataField}`);

      const embeddings = await documentEmbeddingService.generateDocumentEmbeddings([query]);

      const queryEmbedding = embeddings[0];

      if (!queryEmbedding) {
        console.log("Failed to generate query embedding.");
        continue;
      }

      const results = await knowledgeChunkRepository.searchSimilarChunks(
        queryEmbedding,
        "Udaipur, Rajasthan",
        metadataField,
        5,
      );

      if (results.length === 0) {
        console.log("No results found.");
        continue;
      }

      results.forEach((result, index) => {
        console.log(`\n--- RESULT ${index + 1} ---`);
        console.log(`Score: ${result.score}`);
        console.log(`Document ID: ${result.documentId}`);
        console.log(`Destination: ${result.destination}`);
        console.log(`Places: ${result.places.join(", ")}`);
        console.log(`Category: ${result.category}`);

        console.log("\nCONTENT:");
        console.log(result.content);
      });
    }
  } catch (error) {
    console.error("Retrieval test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected.");
  }
}

testRetrieval();
