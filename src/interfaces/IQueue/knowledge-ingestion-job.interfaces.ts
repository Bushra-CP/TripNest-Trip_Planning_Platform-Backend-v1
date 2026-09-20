export interface KnowledgeIngestionJobData {
  documentId: string;
}

export interface IKnowledgeIngestionQueue {
  addJob(data: KnowledgeIngestionJobData): Promise<void>;
}
