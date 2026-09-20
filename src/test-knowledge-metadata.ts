import "reflect-metadata";

import { container } from "./di";
import { TYPES } from "./di/types";
import { connectDB } from "./config/db";
import { KnowledgeChunkRepository } from "./repositories/admin/knowledge-docs-management/knowledge-chunk.repository";

const testMetadata = async (): Promise<void> => {
  await connectDB();

  const repository = container.get<KnowledgeChunkRepository>(TYPES.KnowledgeChunkRepository);

  const chunks = await repository.findChunksByDocument("6aacadb43d9e5c83a14d719c");

  console.log(`Found ${chunks.length} chunks`);

  chunks.forEach((chunk, index) => {
    console.log(`\n========== CHUNK ${index + 1} ==========`);

    console.log("Content:", chunk.content);

    console.log("Places:", chunk.places);
    console.log("Attractions:", chunk.attractions);
    console.log("Activities:", chunk.activities);
    console.log("Accommodation:", chunk.accommodation);
    console.log("Restaurants:", chunk.restaurants);
    console.log("Cuisine:", chunk.cuisine);
    console.log("Transportation:", chunk.transportation);
    console.log("Events:", chunk.events);
    console.log("Festivals:", chunk.festivals);
    console.log("Weather:", chunk.weather);
    console.log("Best Time:", chunk.bestTimeToVisit);
    console.log("Travel Tips:", chunk.travelTips);
    console.log("Safety:", chunk.safety);
    console.log("Budget:", chunk.budget);
    console.log("Topics:", chunk.topics);
  });
};

testMetadata().catch((error: unknown) => {
  console.error("Metadata test failed:", error);
});
