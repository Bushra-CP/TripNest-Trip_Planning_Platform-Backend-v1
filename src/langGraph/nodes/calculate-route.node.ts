import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import type { TripGraphState } from "../trip-graph.state";

// Calculate the route using the existing route service.
export const createCalculateRouteNode = (routePlanningService: RoutePlanningService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const { source, destinations, travelMode } = state.tripRequirements;

    //route cannot be calculated without a source and at least one destination.
    if (!source || destinations.length === 0) {
      return {
        route: null,
      };
    }

    const route = await routePlanningService.calculateRoute({
      source,
      destinations: destinations.map((destination) => destination.name),
      travelMode,
    });

    return {
      route,
    };
  };
};
