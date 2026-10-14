import type { TripGraphState } from "./trip-graph.state";

export const itineraryGenerationDecision = (state: TripGraphState) => {
  console.log("ITINERARY GENERATION DECISION:", {
    confirmationStatus: state.confirmationStatus,
    itineraryRequested: state.itineraryRequested,
    itineraryAction: state.itineraryAction,
  });

  if (
    state.confirmationStatus === "CONFIRMED" &&
    state.itineraryRequested &&
    state.itineraryAction === "CREATE"
  ) {
    console.log("ROUTING TO: generateItinerary");
    return "generateItinerary";
  }

  console.log("ROUTING TO: continuePlanning");
  return "continuePlanning";
};
