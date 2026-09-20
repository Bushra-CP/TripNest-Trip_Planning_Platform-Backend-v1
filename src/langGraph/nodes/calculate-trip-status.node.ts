import type { TripGraphState } from "../trip-graph.state";

/*
 * Calculate the current trip completion status.
 */
export const calculateTripStatus = async (
  state: TripGraphState,
): Promise<Partial<TripGraphState>> => {
  const missingFields: string[] = [];

  const requirements = state.tripRequirements;

  // Check required trip information.
  if (!requirements.source) {
    missingFields.push("source");
  }

  if (requirements.destinations.length === 0) {
    missingFields.push("destinations");
  }

  if (!requirements.startDate) {
    missingFields.push("startDate");
  }

  if (!requirements.totalDays) {
    missingFields.push("totalDays");
  }

  if (!requirements.numberOfTravelers) {
    missingFields.push("numberOfTravelers");
  }

  if (!requirements.budget) {
    missingFields.push("budget");
  }

  if (!requirements.travelMode) {
    missingFields.push("travelMode");
  }

  if (!requirements.tripType) {
    missingFields.push("tripType");
  }

  /*
   * Source + at least one destination are enough
   * to start creating a basic draft.
   */
  const canGenerateDraft = requirements.source !== null && requirements.destinations.length > 0;

  const isComplete = missingFields.length === 0;

  return {
    missingFields,
    isComplete,
    canGenerateDraft,
  };
};
