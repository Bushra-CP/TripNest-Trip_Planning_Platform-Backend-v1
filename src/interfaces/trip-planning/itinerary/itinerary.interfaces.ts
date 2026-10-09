// Itinerary action types
export type ItineraryAction = "CREATE" | "MODIFY" | null;

export type ConfirmationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | null;

// Pending itinerary change
export interface PendingItineraryChange {
  removePlaces: string[];
  addPlaces: string[];
  replacePlaces: {
    remove: string;
    add: string;
  }[];
  description: string;
}
