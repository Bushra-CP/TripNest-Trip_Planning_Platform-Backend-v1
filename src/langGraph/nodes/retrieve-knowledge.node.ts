import { KnowledgeVectorSearchService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";
import type { TripGraphState } from "../trip-graph.state";
import { KnowledgeQueryClassifierService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-query-classifier.service";
import { KnowledgeSourceService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-source.service";

export const createRetrieveKnowledgeNode = (
  knowledgeVectorSearchService: KnowledgeVectorSearchService,
  knowledgeQueryClassifierService: KnowledgeQueryClassifierService,
  knowledgeSourceService: KnowledgeSourceService,
) => {
  return async (state: TripGraphState) => {
    //Get metadata info from user's query
    const metadataField = await knowledgeQueryClassifierService.classify(state.userMessage);

    console.log("Knowledge metadata field:", metadataField);

    console.log("Knowledge destination:", state.currentKnowledgeDestination);

    //Search the knowledge base using the user's current message.
    const results = await knowledgeVectorSearchService.search(
      state.userMessage,
      state.currentKnowledgeDestination,
      metadataField,
      5,
    );

    // console.log("Retrieved chunks:", results.length);

    // Get unique source documents.
    const documentIds = [...new Set(results.map((result) => result.documentId))];

    // Get original TripTales posts.
    const ragSources = await knowledgeSourceService.getSources(documentIds);

    // console.log("RAG sources:", ragSources);

    //Store the retrieved knowledge in the LangGraph state.
    return {
      ragContext: results,
      ragSources,
    };
  };
};
