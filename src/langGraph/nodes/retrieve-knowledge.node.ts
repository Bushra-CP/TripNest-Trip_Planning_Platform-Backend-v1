import { KnowledgeVectorSearchService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";
import type { TripGraphState } from "../trip-graph.state";

export const createRetrieveKnowledgeNode = (
  knowledgeVectorSearchService: KnowledgeVectorSearchService,
) => {
  return async (state: TripGraphState) => {
    //Search the knowledge base using the user's current message.
    const results = await knowledgeVectorSearchService.search(
      state.userMessage,
      state.currentKnowledgeDestination,
      5,
    );

    //Store the retrieved knowledge in the LangGraph state.
    return {
      ragContext: results,
    };
  };
};
