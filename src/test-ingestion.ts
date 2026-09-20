import "reflect-metadata";
import { container } from "./di";
import { TYPES } from "./di/types";
import { connectDB } from "./config/db";
import { KnowledgeChunkModel } from "./models/admin/knowledge-chunk.model";
import { KnowledgeIngestionService } from "./services/admin/ai/rag/doc-chunk-processing/knowledge-injestion.service";

const testIngestion = async (): Promise<void> => {
  await connectDB();

  const ingestionService = container.get<KnowledgeIngestionService>(
    TYPES.KnowledgeIngestionService,
  );

  const document = await ingestionService.processDocument({
    title: "Kerala Travel Guide",
    description: "Test travel knowledge document for Kerala",
    destination: "Kerala",
    category: "DESTINATION",
    filePath: "src/test-data/kerala.txt",
    fileUrl: "test://kerala.txt",
    fileType: "TXT",
    uploadedBy: "test-admin",
  });

  console.log("Document ingestion completed successfully.");

  console.log("Document:", document);

  console.log("Document ID:", document._id.toString());

  console.log("Status:", document.status);

  const chunks = await KnowledgeChunkModel.find({
    documentId: document._id.toString(),
  }).lean();

  console.log("Number of chunks:", chunks.length);

  chunks.forEach((chunk, index) => {
    console.log(`\nChunk ${index + 1}:`);

    console.log("Content:", chunk.content);

    console.log("Embedding length:", chunk.embedding.length);

    console.log("Metadata:", {
      places: chunk.places,
      attractions: chunk.attractions,
      activities: chunk.activities,
      accommodation: chunk.accommodation,
      restaurants: chunk.restaurants,
      cuisine: chunk.cuisine,
      transportation: chunk.transportation,
      events: chunk.events,
      festivals: chunk.festivals,
      weather: chunk.weather,
      bestTimeToVisit: chunk.bestTimeToVisit,
      travelTips: chunk.travelTips,
      safety: chunk.safety,
      budget: chunk.budget,
      topics: chunk.topics,
    });
  });
};

testIngestion().catch((error: unknown) => {
  console.error("Document ingestion failed:", error);
});
