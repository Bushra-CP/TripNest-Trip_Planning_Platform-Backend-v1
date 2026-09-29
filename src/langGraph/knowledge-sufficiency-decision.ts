import type { TripGraphState } from "./trip-graph.state";

export const knowledgeSufficiencyDecision = (state: TripGraphState) => {
  return state.knowledgeSufficient ? "generateResponse" : "acquireKnowledge";
};
