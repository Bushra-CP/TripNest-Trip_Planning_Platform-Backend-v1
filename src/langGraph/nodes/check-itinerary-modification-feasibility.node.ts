import type { TripGraphState } from "@/langGraph/trip-graph.state";
import { ItineraryModificationFeasibilityService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-feasibility.service";
import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

export const createCheckItineraryModificationFeasibilityNode = (
  itineraryService: IItineraryService,
  feasibilityService: ItineraryModificationFeasibilityService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    try {
      if (!state.tripId || !state.threadId) {
        return {
          response: "I couldn't identify your current trip. Please try again.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      if (!state.pendingItineraryChange) {
        return {
          response:
            "I couldn't identify the changes you want to make. Please describe what you'd like to add, remove, or replace.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      const itinerary = await itineraryService.getItineraryByTripId(state.tripId, state.threadId);

      if (!itinerary) {
        return {
          response:
            "I couldn't find a saved itinerary for this trip. Please generate an itinerary before requesting modifications.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      const feasibility = await feasibilityService.assessFeasibility(
        itinerary,
        state.pendingItineraryChange,
      );

      if (feasibility.status === "NOT_FEASIBLE") {
        return {
          response: [
            "I couldn't safely fit the requested changes into your current itinerary.",
            feasibility.summary,
            ...feasibility.concerns.map((concern) => `• ${concern}`),
            "",
            "You can revise your request or consider changing the trip duration.",
          ].join("\n"),
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: feasibility,
        };
      }

      const response = [
        "I've assessed your requested itinerary changes.",
        "",
        feasibility.summary,
        "",
        "Proposed changes:",
        ...feasibility.proposedChanges.map((change) => `• ${change}`),
        ...(feasibility.concerns.length > 0
          ? ["", "Things to consider:", ...feasibility.concerns.map((concern) => `• ${concern}`)]
          : []),
        ...(feasibility.requiresAdditionalDays
          ? ["", "These changes may require additional days."]
          : []),
        "",
        "Would you like me to apply these changes to your itinerary? Please answer yes or no.",
        "",
        "Your saved itinerary has not been modified.",
      ].join("\n");

      return {
        response,
        itineraryRequested: true,
        itineraryAction: "MODIFY",
        confirmationStatus: "PENDING",
        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: feasibility,
      };
    } catch (error) {
      console.error("ITINERARY MODIFICATION FEASIBILITY ERROR:", error);

      return {
        response:
          "I couldn't assess whether these changes fit your itinerary. Your saved itinerary has not been modified. Please try again.",
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
        modificationFeasibility: null,
      };
    }
  };
};
