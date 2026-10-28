import { TripGraphState } from "@/langGraph/trip-graph.state";
import type { ItineraryModificationValidationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-validation.service";

export const createValidateItineraryModificationNode = (
  itineraryModificationValidationService: ItineraryModificationValidationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    if (!state.tripId || !state.threadId) {
      return {
        response: "I couldn't identify the current trip. Please try again.",
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
      };
    }

    if (!state.pendingItineraryChange) {
      return {
        response:
          "I couldn't identify the changes you want to make. Please specify what you'd like to add, remove, or replace.",
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
      };
    }

    const result = await itineraryModificationValidationService.validateModification(
      state.tripId,
      state.threadId,
      state.pendingItineraryChange,
    );

    if (!result.isValid) {
      return {
        response: `I couldn't validate your itinerary changes:\n${result.errors
          .map((error) => `• ${error}`)
          .join("\n")}\n\nPlease review your request and try again.`,
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
      };
    }

    return {
      response:
        "Your requested itinerary changes have passed the initial validation. I'll check whether they fit your existing trip before making any changes.",
      itineraryRequested: true,
      itineraryAction: "MODIFY",
      confirmationStatus: null,
      pendingItineraryChange: state.pendingItineraryChange,
    };
  };
};
