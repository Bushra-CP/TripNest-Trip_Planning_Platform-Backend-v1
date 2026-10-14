import type { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import type { IItineraryDay } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";

export interface SaveItineraryPayload {
  tripId: string;
  threadId: string;
  userId: string | null;
  requirements: TripRequirements;
  title: string;
  days: IItineraryDay[];
}

export interface UpdateItineraryPayload {
  tripId: string;
  threadId: string;
  title?: string;
  days?: IItineraryDay[];
}

export interface IItineraryService {
  saveItinerary(payload: SaveItineraryPayload): Promise<IItinerary>;

  getItineraryByTripId(tripId: string, threadId: string): Promise<IItinerary | null>;

  updateItinerary(payload: UpdateItineraryPayload): Promise<IItinerary>;

  deleteItineraryByTripId(tripId: string, threadId: string): Promise<boolean>;
}
