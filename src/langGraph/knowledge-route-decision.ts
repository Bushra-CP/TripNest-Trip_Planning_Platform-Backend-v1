import type { TripGraphState } from "./trip-graph.state";

export const knowledgeRouteDecision = (
  state: TripGraphState,
): "retrieveKnowledge" | "generateResponse" => {
  console.log("Knowledge route decision:", state.requestRoute);

  if (state.requestRoute === "knowledge") {
    console.log("→ Going to retrieveKnowledge");
    return "retrieveKnowledge";
  }

  console.log("→ Going directly to generateResponse");
  return "generateResponse";
};
