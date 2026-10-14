import { inject, injectable } from "inversify";
import { Job, Worker } from "bullmq";

import { redisConnection } from "@/config/redis";
import { TYPES } from "@/di/types";

import { ItineraryIngestionJobData } from "@/interfaces/IQueue/itinerary-ingestion-job.interfaces";
import { ItineraryIngestionService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-ingestion.service";

@injectable()
export class ItineraryIngestionWorker {
  private readonly worker: Worker<ItineraryIngestionJobData>;

  constructor(
    @inject(TYPES.ItineraryIngestionService)
    private readonly _itineraryIngestionService: ItineraryIngestionService,
  ) {
    this.worker = new Worker<ItineraryIngestionJobData>(
      "itinerary-ingestion",
      async (job: Job<ItineraryIngestionJobData>) => this.processJob(job),
      {
        connection: redisConnection,
      },
    );

    console.log("Itinerary ingestion worker initialized.");

    this.worker.on("completed", (job) => {
      console.log(`Itinerary ingestion completed: ${job.data.itineraryId}`);
    });

    this.worker.on("failed", (job, error) => {
      console.error(`Itinerary ingestion failed for ${job?.data.itineraryId}:`, error);
    });

    this.worker.on("error", (error) => {
      console.error("Itinerary ingestion worker error:", error);
    });
  }

  private async processJob(
    job: Job<ItineraryIngestionJobData>,
  ): Promise<{ itineraryId: string; status: string }> {
    const { itineraryId } = job.data;

    console.log(`[Itinerary Ingestion] Job ${job.id} started for itinerary: ${itineraryId}`);

    try {
      await this._itineraryIngestionService.processItinerary(itineraryId);

      console.log(
        `[Itinerary Ingestion] Job ${job.id} completed successfully for itinerary: ${itineraryId}`,
      );

      return {
        itineraryId,
        status: "completed",
      };
    } catch (error) {
      console.error(
        `[Itinerary Ingestion] Job ${job.id} failed for itinerary: ${itineraryId}`,
        error,
      );

      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
