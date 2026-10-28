// Itinerary action types
export type ItineraryAction = "CREATE" | "MODIFY" | null;

export type ConfirmationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | null;

// Pending itinerary change
export interface PendingItineraryChange {
  removePlaces: { name: string; dayNumber?: number | undefined }[];
  addPlaces: {
    name: string;
    dayNumber?: number | undefined;
    insertBefore?: string | undefined;
    insertAfter?: string | undefined;
    preferredTime?: string | undefined;
  }[];
  replacePlaces: {
    remove: string;
    add: string;
    dayNumber?: number | undefined;
    preferredTime?: string | undefined;
  }[];
  description: string;
}
