import { ItineraryIntentService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-intent.service";
import type { TripGraphState } from "../trip-graph.state";

export const createDetectItineraryIntentNode = (itineraryIntentService: ItineraryIntentService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("INTENT STATE BEFORE DETECTION:", {
      userMessage: state.userMessage,
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
      confirmationStatus: state.confirmationStatus,
    });

    // STEP 1: Handle confirmation of a pending itinerary request first.
    if (state.itineraryRequested && state.confirmationStatus === "PENDING") {
      const confirmation = await itineraryIntentService.detectConfirmation(state.userMessage);

      console.log("USER CONFIRMATION:", confirmation);

      if (confirmation === "YES") {
        return {
          itineraryRequested: true,
          itineraryAction: state.itineraryAction,
          confirmationStatus: "CONFIRMED",
          pendingItineraryChange: state.pendingItineraryChange,
        };
      }

      if (confirmation === "NO") {
        return {
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: "REJECTED",
          pendingItineraryChange: null,
        };
      }

      return {
        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: "PENDING",
        pendingItineraryChange: state.pendingItineraryChange,
      };
    }

    // STEP 2: Detect a new itinerary request.
    const result = await itineraryIntentService.detectIntent(state.userMessage);

    console.log("ITINERARY INTENT RESULT:", result);

    if (result.itineraryRequested) {
      return {
        itineraryRequested: true,
        itineraryAction: result.itineraryAction,
        confirmationStatus: null,
        pendingItineraryChange:
          result.itineraryAction === "CREATE" ? null : state.pendingItineraryChange,
      };
    }

    // STEP 3: Clear a previously confirmed request when the user
    // sends a new message that isn't another itinerary request.
    if (state.itineraryRequested && state.confirmationStatus === "CONFIRMED") {
      return {
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
      };
    }

    // STEP 4: Preserve other existing itinerary states.
    if (state.itineraryRequested) {
      return {
        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: state.confirmationStatus,
        pendingItineraryChange: state.pendingItineraryChange,
      };
    }

    // STEP 5: Continue normal conversation.
    return {
      itineraryRequested: false,
      itineraryAction: null,
      confirmationStatus: state.confirmationStatus,
      pendingItineraryChange: state.pendingItineraryChange,
    };
  };
};
