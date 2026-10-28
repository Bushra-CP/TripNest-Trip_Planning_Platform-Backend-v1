import { ItineraryIntentService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-intent.service";
import type { TripGraphState } from "../trip-graph.state";

export const createDetectItineraryIntentNode = (itineraryIntentService: ItineraryIntentService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("INTENT STATE BEFORE DETECTION:", {
      userMessage: state.userMessage,
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
      confirmationStatus: state.confirmationStatus,
      hasPendingItineraryChange: Boolean(state.pendingItineraryChange),
      hasFeasibilityAssessment: Boolean(state.modificationFeasibility),
    });

    // STEP 1: Check whether the message confirms or rejects a pending request.
    if (state.itineraryRequested && state.confirmationStatus === "PENDING") {
      const confirmation = await itineraryIntentService.detectConfirmation(state.userMessage);

      console.log("USER CONFIRMATION:", confirmation);

      if (confirmation === "YES") {
        return {
          itineraryRequested: true,
          itineraryAction: state.itineraryAction,
          confirmationStatus: "CONFIRMED",
          pendingItineraryChange: state.pendingItineraryChange,
          modificationFeasibility: state.modificationFeasibility,
        };
      }

      if (confirmation === "NO") {
        return {
          response:
            "No problem. I haven't changed your saved itinerary. You can tell me what you'd like to change instead.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: "REJECTED",
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      // Not a yes/no answer. Check whether this is a new itinerary request.
      const newIntent = await itineraryIntentService.detectIntent(state.userMessage);

      console.log("NEW INTENT WHILE CONFIRMATION PENDING:", newIntent);

      if (newIntent.itineraryRequested) {
        if (newIntent.itineraryAction === "MODIFY") {
          const change = await itineraryIntentService.extractModification(state.userMessage);

          console.log("NEW EXTRACTED MODIFICATION:", change);

          return {
            itineraryRequested: true,
            itineraryAction: "MODIFY",
            confirmationStatus: null,
            pendingItineraryChange: change,
            modificationFeasibility: null,
          };
        }

        if (newIntent.itineraryAction === "CREATE") {
          return {
            itineraryRequested: true,
            itineraryAction: "CREATE",
            confirmationStatus: null,
            pendingItineraryChange: null,
            modificationFeasibility: null,
          };
        }
      }

      // The message was neither a confirmation nor a new itinerary request.
      return {
        response:
          "Would you like me to proceed with the proposed itinerary changes, or would you prefer to request a different modification? Please answer yes or no, or describe the new change.",
        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: "PENDING",
        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: state.modificationFeasibility,
      };
    }

    // STEP 2: Detect a new itinerary request when no confirmation is pending.
    const result = await itineraryIntentService.detectIntent(state.userMessage);

    console.log("ITINERARY INTENT RESULT:", result);

    if (result.itineraryRequested) {
      if (result.itineraryAction === "MODIFY") {
        const change = await itineraryIntentService.extractModification(state.userMessage);

        console.log("EXTRACTED ITINERARY MODIFICATION:", change);

        return {
          itineraryRequested: true,
          itineraryAction: "MODIFY",
          confirmationStatus: null,
          pendingItineraryChange: change,
          modificationFeasibility: null,
        };
      }

      if (result.itineraryAction === "CREATE") {
        return {
          itineraryRequested: true,
          itineraryAction: "CREATE",
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }
    }

    // STEP 3: Clear stale state after a confirmed request if a different
    // conversation message is received.
    if (state.itineraryRequested && state.confirmationStatus === "CONFIRMED") {
      return {
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
        modificationFeasibility: null,
      };
    }

    // STEP 4: Preserve state if a request is still active.
    if (state.itineraryRequested) {
      return {
        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: state.confirmationStatus,
        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: state.modificationFeasibility,
      };
    }

    // STEP 5: Continue normal conversation.
    return {
      itineraryRequested: false,
      itineraryAction: null,
      confirmationStatus: state.confirmationStatus,
      pendingItineraryChange: state.pendingItineraryChange,
      modificationFeasibility: state.modificationFeasibility,
    };
  };
};
