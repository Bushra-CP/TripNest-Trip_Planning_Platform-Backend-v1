import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import type { TripGraphState } from "../trip-graph.state";

/*
 * Resolve relative dates in the trip requirements.
 */
export const createResolveDateNode = (tripDateService: TripDateService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const requirements = tripDateService.resolveStartDate(state.tripRequirements);

    return {
      tripRequirements: requirements,
    };
  };
};
