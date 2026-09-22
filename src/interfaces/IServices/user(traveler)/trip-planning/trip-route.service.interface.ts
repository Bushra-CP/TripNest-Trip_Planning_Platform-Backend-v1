import { ITripRoute } from "@/interfaces/IModel/trip-planning/ITripRoute";
import type { RoutePlanningResult } from "@/interfaces/trip-planning/route.interfaces";

export interface TripRoutePayload {
  tripId: string;
  route: RoutePlanningResult;
}

export interface ITripRouteService {
  saveRoute(payload: TripRoutePayload): Promise<ITripRoute>;
}
