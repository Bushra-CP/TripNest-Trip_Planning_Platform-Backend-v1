import { env } from "@/config/env";
import { ChunkMetadata } from "@/interfaces/IModel/knowledge-document.interfaces";
import { batchChunkMetadataResultSchema } from "@/validation/user(traveler)/trip-planning/chunkMetadata.schema";
import { ChatGroq } from "@langchain/groq";
import { injectable } from "inversify";

@injectable()
export class ChunkMetadataExtractionService {
  private readonly model: ChatGroq;

  //Maximum number of chunks sent to the LLM in one request.
  private readonly batchSize = 5;

  constructor() {
    this.model = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      temperature: 0,
    });
  }

  public async extractMetadata(chunks: string[]): Promise<ChunkMetadata[]> {
    if (chunks.length === 0) {
      throw new Error("Cannot extract metadata from an empty batch");
    }

    for (const chunk of chunks) {
      if (!chunk.trim()) {
        throw new Error("Cannot extract metadata from an empty chunk");
      }
    }

    //5 chunks → 1 LLM call
    return this.extractBatchMetadata(chunks);
  }

  /**
   * Extract metadata for one batch.
   *
   * If the LLM returns the wrong number of results,
   * split the batch into smaller batches and try again.
   */
  private async extractBatchMetadata(chunks: string[]): Promise<ChunkMetadata[]> {
    const results = await this.callLLM(chunks);

    if (results.length === chunks.length) {
      return results;
    }

    console.warn(
      `Metadata count mismatch. ` + `Expected ${chunks.length}, received ${results.length}.`,
    );

    //If there is only one chunk, we cannot split it further.
    if (chunks.length === 1) {
      throw new Error(`Expected metadata for 1 chunk, but received ${results.length}`);
    }

    //Split the failed batch into two smaller batches.
    const middle = Math.ceil(chunks.length / 2);

    const firstBatch = chunks.slice(0, middle);
    const secondBatch = chunks.slice(middle);

    console.log(
      `Splitting metadata batch of ${chunks.length} chunks ` +
        `into ${firstBatch.length} and ${secondBatch.length} chunks.`,
    );

    const firstResults = await this.extractBatchMetadata(firstBatch);

    const secondResults = await this.extractBatchMetadata(secondBatch);

    return [...firstResults, ...secondResults];
  }

  //Makes the actual Groq structured-output request.
  private async callLLM(chunks: string[]): Promise<ChunkMetadata[]> {
    const structuredModel = this.model.withStructuredOutput(batchChunkMetadataResultSchema);

    const formattedChunks = chunks
      .map(
        (chunk, index) => `
========== CHUNK ${index} ==========

${chunk}

========== END CHUNK ${index} ==========
`,
      )
      .join("\n");

    const response = await structuredModel.invoke(`
You are a travel knowledge metadata extractor.

You will receive multiple knowledge chunks.

Analyze EACH chunk independently.

IMPORTANT RULES:

- Process every chunk separately.
- Do not combine information between chunks.
- Extract only information explicitly supported
  by that specific chunk.
- Never invent or assume information.
- A category can contain multiple values.
- If a category is not mentioned, return an empty array.
- Keep important names and terms from the original text.
- Do not add explanations.
- Return exactly one metadata object for every chunk.
- Never skip a chunk.
- Never duplicate a chunk.
- The results MUST be returned in the same order
  as the input chunks.
- The chunkIndex MUST match the input chunk index.

Categories:

places:
Specific geographical places or destinations.

attractions:
Tourist attractions, landmarks, parks, beaches,
waterfalls, viewpoints, museums, monuments,
and similar attractions.

activities:
Things travelers can do such as trekking,
boating, camping, sightseeing, wildlife watching,
and similar activities.

accommodation:
Hotels, resorts, homestays, hostels, camps,
and other places to stay.

restaurants:
Specific restaurants, cafes, or food establishments.

cuisine:
Local cuisines, dishes, or types of food.

transportation:
Buses, trains, taxis, airports, routes, vehicles,
and other transportation information.

events:
Specific events mentioned in the chunk.

festivals:
Festivals or celebrations mentioned in the chunk.

weather:
Weather or climate information.

bestTimeToVisit:
Months, seasons, or periods recommended for visiting.

travelTips:
Useful practical advice that helps a traveler.

Do not put accommodation or price information here.

safety:
Safety information, warnings, or precautions.

budget:
Actual or explicitly stated cost and price information.

Do not put general accommodation information here unless
the text specifically connects it to cost or budget.

topics:
General subjects discussed in the chunk, such as nature,
wildlife, beaches, culture, history, food, adventure,
photography, shopping, and similar topics.

Return the metadata inside the "results" field.

Here are the knowledge chunks:

${formattedChunks}
`);

    const metadataResults = response.results;

    //Return the results even if the count is incorrect.
    //The caller will detect the mismatch and split the batch.
    if (metadataResults.length !== chunks.length) {
      return metadataResults.map(({ chunkIndex: _chunkIndex, ...metadata }) => metadata);
    }

    //Validate chunk indexes.
    const expectedIndexes = chunks.map((_, index) => index);

    const returnedIndexes = metadataResults.map((metadata) => metadata.chunkIndex);

    const indexesAreValid =
      returnedIndexes.length === expectedIndexes.length &&
      returnedIndexes.every((index, position) => index === expectedIndexes[position]);

    if (!indexesAreValid) {
      throw new Error(
        `Metadata chunk indexes are invalid. ` +
          `Expected [${expectedIndexes.join(", ")}], ` +
          `received [${returnedIndexes.join(", ")}].`,
      );
    }

    //Remove chunkIndex before returning.
    return metadataResults.map(({ chunkIndex: _chunkIndex, ...metadata }) => metadata);
  }
}
