import { Queue } from "bullmq";
import { redisConnection } from "@/config/redis";
import {
  IKnowledgeIngestionQueue,
  KnowledgeIngestionJobData,
} from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { injectable } from "inversify";

/**
 Queue used for processing knowledge document ingestion.
 
 The API will add jobs to this queue.
 
 A separate worker will later take jobs from this queue and perform the actual ingestion.
 */
@injectable()
export class KnowledgeIngestionQueue implements IKnowledgeIngestionQueue {
  private readonly queue: Queue<KnowledgeIngestionJobData>;

  constructor() {
    this.queue = new Queue<KnowledgeIngestionJobData>("knowledge-ingestion", {
      connection: redisConnection,
    });
  }

  public async addJob(data: KnowledgeIngestionJobData): Promise<void> {
    await this.queue.add("process-document", data);
  }
}
