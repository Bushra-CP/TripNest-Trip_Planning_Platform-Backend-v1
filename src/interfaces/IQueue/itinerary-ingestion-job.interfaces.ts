export interface ItineraryIngestionJobData {
  itineraryId: string;
}

export interface IItineraryIngestionQueue {
  addJob(data: ItineraryIngestionJobData): Promise<void>;
}
