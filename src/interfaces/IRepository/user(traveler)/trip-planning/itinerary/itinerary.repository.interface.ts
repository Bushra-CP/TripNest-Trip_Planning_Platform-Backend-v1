import { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface IItineraryRepository extends IBaseRepository<IItinerary> {
  findByTripId(tripId: string): Promise<IItinerary | null>;

  findByThreadId(threadId: string): Promise<IItinerary | null>;

  updateByTripId(tripId: string, data: Partial<IItinerary>): Promise<IItinerary | null>;

  deleteByTripId(tripId: string): Promise<IItinerary | null>;
}
