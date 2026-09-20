import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";
import type { TripGraphState } from "../trip-graph.state";

/*
 * Check whether the route needs to be recalculated.
 */
export const createCheckRouteChangeNode = (
  tripChangeDetectorService: TripChangeDetectorService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const routeChanged = tripChangeDetectorService.hasRouteChanged(
      state.previousTripRequirements,
      state.tripRequirements,
    );

    return {
      routeChanged,
    };
  };
};
