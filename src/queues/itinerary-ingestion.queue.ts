import { Queue } from "bullmq";
import { redisConnection } from "@/config/redis";
import {
  IItineraryIngestionQueue,
  ItineraryIngestionJobData,
} from "@/interfaces/IQueue/itinerary-ingestion-job.interfaces";
import { injectable } from "inversify";

@injectable()
export class ItineraryIngestionQueue implements IItineraryIngestionQueue {
  private readonly queue: Queue<ItineraryIngestionJobData>;

  constructor() {
    this.queue = new Queue<ItineraryIngestionJobData>("itinerary-ingestion", {
      connection: redisConnection,
    });
  }

  public async addJob(data: ItineraryIngestionJobData): Promise<void> {
    await this.queue.add("process-itinerary", data);
  }
}
