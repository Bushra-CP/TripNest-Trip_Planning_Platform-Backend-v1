import type { TripGraphState } from "./trip-graph.state";

// Decide whether the route needs to be recalculated.
export const routeDecision = (state: TripGraphState): "calculateRoute" | "generateResponse" => {
  if (state.routeChanged) {
    return "calculateRoute";
  }

  return "generateResponse";
};
