import { z } from "zod";

export const chunkMetadataSchema = z.object({
  chunkIndex: z.number().int().nonnegative(),

  places: z.array(z.string()),
  attractions: z.array(z.string()),
  activities: z.array(z.string()),
  accommodation: z.array(z.string()),
  restaurants: z.array(z.string()),
  cuisine: z.array(z.string()),
  transportation: z.array(z.string()),
  events: z.array(z.string()),
  festivals: z.array(z.string()),
  weather: z.array(z.string()),
  bestTimeToVisit: z.array(z.string()),
  travelTips: z.array(z.string()),
  safety: z.array(z.string()),
  budget: z.array(z.string()),
  topics: z.array(z.string()),
});

/**
 * Schema for metadata extracted from multiple chunks in a single LLM call.
 */
export const batchChunkMetadataResultSchema = z.object({
  results: z.array(chunkMetadataSchema),
});
