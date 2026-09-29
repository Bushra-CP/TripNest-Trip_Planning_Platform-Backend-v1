import { KnowledgeSufficiencyService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-sufficiency.service";
import { TripGraphState } from "../trip-graph.state";

export const createCheckKnowledgeSufficiencyNode = (
  knowledgeSufficiencyService: KnowledgeSufficiencyService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const sufficient = await knowledgeSufficiencyService.isSufficient(
      state.userMessage,
      state.ragContext,
    );

    console.log("Knowledge sufficient:", sufficient);

    return {
      knowledgeSufficient: sufficient,
    };
  };
};
