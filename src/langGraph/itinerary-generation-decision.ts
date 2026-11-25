import type { TripGraphState } from "./trip-graph.state";

export const itineraryGenerationDecision = (state: TripGraphState) => {
  console.log("ITINERARY GENERATION DECISION:", {
    recommendationRequested: state.recommendationRequested,
    recommendationDayNumber: state.recommendationDayNumber,
    currentKnowledgeDestination: state.currentKnowledgeDestination,
    confirmationStatus: state.confirmationStatus,
    itineraryRequested: state.itineraryRequested,
    itineraryAction: state.itineraryAction,
    modificationClarificationRequested: state.modificationClarificationRequested,
    hasPendingChange: Boolean(state.pendingItineraryChange),
    hasFeasibilityAssessment: Boolean(state.modificationFeasibility),
    feasibilityStatus: state.modificationFeasibility?.status,
    proposedItineraryDaysCount: state.proposedItineraryDays.length,
    affectedDayNumbers: state.affectedDayNumbers,
  });

  // 1. Day-based attraction recommendations.
  if (state.recommendationRequested && state.recommendationDayNumber !== null) {
    console.log("ROUTING TO: generateAttractionRecommendations");

    return "generateAttractionRecommendations";
  }

  // 2. Destination-based attraction recommendations.
  // Continue through the existing RAG workflow.
  if (state.recommendationRequested && state.recommendationDayNumber === null) {
    console.log("ROUTING TO: continuePlanning (RAG)");

    return "continuePlanning";
  }

  // 3. Modification clarification questions.
  if (
    state.modificationClarificationRequested &&
    state.itineraryRequested &&
    state.itineraryAction === "MODIFY" &&
    state.confirmationStatus === "PENDING" &&
    state.pendingItineraryChange !== null &&
    state.modificationFeasibility !== null &&
    state.proposedItineraryDays.length > 0
  ) {
    console.log("ROUTING TO: answerModificationClarification");

    return "answerModificationClarification";
  }

  // 4. Confirmed itinerary creation.
  if (
    state.itineraryRequested &&
    state.itineraryAction === "CREATE" &&
    state.confirmationStatus === "CONFIRMED"
  ) {
    console.log("ROUTING TO: generateItinerary");

    return "generateItinerary";
  }

  // 5. Confirmed itinerary modification.
  if (
    state.itineraryRequested &&
    state.itineraryAction === "MODIFY" &&
    state.confirmationStatus === "CONFIRMED"
  ) {
    const hasValidModification =
      state.pendingItineraryChange !== null &&
      state.modificationFeasibility !== null &&
      state.modificationFeasibility.status !== "NOT_FEASIBLE" &&
      state.proposedItineraryDays.length > 0 &&
      state.affectedDayNumbers.length > 0;

    if (hasValidModification) {
      console.log("ROUTING TO: applyItineraryModification");

      return "applyItineraryModification";
    }

    console.error("Invalid confirmed modification state.", {
      hasPendingChange: Boolean(state.pendingItineraryChange),
      hasFeasibilityAssessment: Boolean(state.modificationFeasibility),
      feasibilityStatus: state.modificationFeasibility?.status,
      proposedItineraryDaysCount: state.proposedItineraryDays.length,
      affectedDayNumbers: state.affectedDayNumbers,
    });

    return "end";
  }

  // 6. New modification request.
  if (
    state.itineraryRequested &&
    state.itineraryAction === "MODIFY" &&
    state.confirmationStatus === null &&
    state.pendingItineraryChange !== null &&
    state.modificationFeasibility === null
  ) {
    console.log("ROUTING TO: validateItineraryModification");

    return "validateItineraryModification";
  }

  // 7. Awaiting confirmation.
  if (state.itineraryRequested && state.confirmationStatus === "PENDING") {
    console.log("ROUTING TO: END (awaiting confirmation)");

    return "end";
  }

  // 8. Rejected request.
  if (state.confirmationStatus === "REJECTED") {
    console.log("ROUTING TO: END (request rejected)");

    return "end";
  }

  // 9. Normal trip-planning conversation.
  console.log("ROUTING TO: continuePlanning");

  return "continuePlanning";
};
