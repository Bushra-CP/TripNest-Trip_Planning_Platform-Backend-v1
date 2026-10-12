import { ItineraryIntentService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-intent.service";
import type { TripGraphState } from "../trip-graph.state";

export const createDetectItineraryIntentNode = (itineraryIntentService: ItineraryIntentService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("INTENT STATE BEFORE DETECTION:", {
      userMessage: state.userMessage,
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
    });

    const result = await itineraryIntentService.detectIntent(state.userMessage);

    console.log("from createDetectItineraryIntentNode:", result);

    /*
     * If the current message contains an itinerary intent,
     * start/update the itinerary action.
     */
    console.log("PRESERVING ITINERARY FLOW:", {
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
    });

    if (result.itineraryRequested) {
      console.log("RETURNING PRESERVED ITINERARY FLOW");

      return {
        itineraryRequested: true,

        itineraryAction: result.itineraryAction,

        confirmationStatus: null,

        pendingItineraryChange:
          result.itineraryAction === "CREATE" ? null : state.pendingItineraryChange,
      };
    }

    /*
     * If the user is already in an itinerary flow,
     * preserve that state while they answer questions.
     *
     * Example:
     *
     * User: "Create an itinerary"
     * AI: "How many days?"
     * User: "3 days"
     *
     * "3 days" is not an itinerary intent itself,
     * but we must continue the CREATE flow.
     */
    if (state.itineraryRequested) {
      return {
        itineraryRequested: true,

        itineraryAction: state.itineraryAction,

        confirmationStatus: state.confirmationStatus,

        pendingItineraryChange: state.pendingItineraryChange,
      };
    }

    //Normal conversation.
    return {
      itineraryRequested: false,
      itineraryAction: null,
      confirmationStatus: state.confirmationStatus,
      pendingItineraryChange: state.pendingItineraryChange,
    };
  };
};
