import type { TripGraphState } from "./trip-graph.state";

export const itineraryGenerationDecision = (state: TripGraphState) => {
  console.log("ITINERARY GENERATION DECISION:", {
    confirmationStatus: state.confirmationStatus,
    itineraryRequested: state.itineraryRequested,
    itineraryAction: state.itineraryAction,
    hasPendingChange: Boolean(state.pendingItineraryChange),
    hasFeasibilityAssessment: Boolean(state.modificationFeasibility),
  });

  // Confirmed itinerary creation.
  if (
    state.confirmationStatus === "CONFIRMED" &&
    state.itineraryRequested &&
    state.itineraryAction === "CREATE"
  ) {
    console.log("ROUTING TO: generateItinerary");
    return "generateItinerary";
  }

  // Confirmed itinerary modification.
  if (
    state.confirmationStatus === "CONFIRMED" &&
    state.itineraryRequested &&
    state.itineraryAction === "MODIFY" &&
    state.pendingItineraryChange &&
    state.modificationFeasibility
  ) {
    console.log("ROUTING TO: applyItineraryModification");
    return "applyItineraryModification";
  }

  // A new modification request that needs validation.
  if (
    state.itineraryRequested &&
    state.itineraryAction === "MODIFY" &&
    state.confirmationStatus === null &&
    state.pendingItineraryChange &&
    !state.modificationFeasibility
  ) {
    console.log("ROUTING TO: validateItineraryModification");
    return "validateItineraryModification";
  }

  // A confirmation is still pending. End this execution and wait
  // for the user's next message.
  if (state.itineraryRequested && state.confirmationStatus === "PENDING") {
    console.log("ROUTING TO: END (awaiting confirmation)");
    return "end";
  }

  // A rejected request should return its cancellation response directly.
  if (state.confirmationStatus === "REJECTED") {
    console.log("ROUTING TO: END (request rejected)");
    return "end";
  }

  console.log("ROUTING TO: continuePlanning");
  return "continuePlanning";
};
