import { IItineraryChunk } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";
import { Types } from "mongoose";

export interface ItineraryChunkSearchResult {
  templateId: Types.ObjectId;
  version: number;
  chunkIndex: number;
  content: string;

  metadata: {
    source: string;
    destinations: string[];
    totalDays: number;
    travelMode: string;
    tripType: string;
    preferences: string[];
  };

  score: number;
}

export interface IItineraryChunkRepository extends IBaseRepository<IItineraryChunk> {
  searchSimilarChunks(
    queryEmbedding: number[],
    limit?: number,
  ): Promise<ItineraryChunkSearchResult[]>;

  findChunksByTemplate(templateId: Types.ObjectId, version?: number): Promise<IItineraryChunk[]>;
}
