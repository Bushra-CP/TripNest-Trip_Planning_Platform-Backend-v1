import { RouteRequestService } from "@/services/user(traveler)/trip-planning/ai-planning/route-request.service";

import type { TripGraphState } from "../trip-graph.state";

export const createRouteRequestNode = (routeRequestService: RouteRequestService) => {
  return async (state: TripGraphState) => {
    const requestRoute = await routeRequestService.decideRoute(state.userMessage);

    console.log("Request route:", requestRoute);

    return {
      requestRoute,
    };
  };
};
