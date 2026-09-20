import { redisConnection } from "@/config/redis";
import { TYPES } from "@/di/types";
import { KnowledgeIngestionJobData } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { KnowledgeIngestionService } from "@/services/admin/ai/rag/doc-chunk-processing/knowledge-injestion.service";
import { Job, Worker } from "bullmq";
import { inject, injectable } from "inversify";

@injectable()
export class KnowledgeIngestionWorker {
  private readonly worker: Worker<
    KnowledgeIngestionJobData,
    {
      documentId: string;
      status: string;
    }
  >;

  constructor(
    @inject(TYPES.KnowledgeIngestionService)
    private readonly _knowledgeIngestionService: KnowledgeIngestionService,
  ) {
    //Create BullMQ worker
    //the worker listens to the 'knowledge-ingestion' queue
    this.worker = new Worker<
      KnowledgeIngestionJobData,
      {
        documentId: string;
        status: string;
      }
    >(
      "knowledge-ingestion",

      async (job: Job<KnowledgeIngestionJobData>) => {
        return this.processJob(job);
      },
      { connection: redisConnection },
    );

    console.log("Knowledge ingestion worker initialized.");

    //Handle successfully completed jobs
    this.worker.on("completed", (job) => {
      console.log(`Knowledge ingestion job ${job.id} completed successfully.`);
    });

    //Handle failed jobs
    this.worker.on("failed", (job, error) => {
      console.error(`Knowledge ingestion job ${job?.id} failed:`, error);
    });

    //Handle worker level errors
    this.worker.on("error", (error) => {
      console.error("Knowledge ingestion worker error:", error);
    });
  }

  //processJob method
  //Processes one knowledge injestion job
  //The worker passes the job data to the existing KnowledgeIngestionService
  private async processJob(job: Job<KnowledgeIngestionJobData>): Promise<{
    documentId: string;
    status: string;
  }> {
    console.log(`Processing knowledge ingestion job ${job.id}...`);

    const document = await this._knowledgeIngestionService.processDocument(job.data.documentId);

    console.log(`Knowledge document ${document._id.toString()} processed successfully.`);

    //Return few result details that BullMQ can store as the job result
    return {
      documentId: document._id.toString(),
      status: document.status,
    };
  }

  //To close the worker
  //Can be used when shutting down the Node.js worker process
  public async close(): Promise<void> {
    await this.worker.close();
  }
}
