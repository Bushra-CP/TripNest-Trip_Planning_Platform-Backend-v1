import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import type { TripGraphState } from "../trip-graph.state";

// Update the existing trip state with newly extracted requirements.
export const createUpdateTripStateNode = (tripStateService: TripStateService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const updatedRequirements = tripStateService.mergeState(
      state.previousTripRequirements,
      state.tripRequirements,
      state.destinationOrderChanged,
    );

    return {
      tripRequirements: updatedRequirements,
    };
  };
};
