import { KnowledgeAcquisitionService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-acquisition.service";
import { TripGraphState } from "../trip-graph.state";

export const createAcquireKnowledgeNode = (
  knowledgeAcquisitionService: KnowledgeAcquisitionService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const acquiredKnowledge = await knowledgeAcquisitionService.acquireKnowledge({
      userMessage: state.userMessage,
      destination: state.currentKnowledgeDestination,
      metadataField: state.knowledgeMetadataField,
    });

    console.log("Acquired knowledge:", acquiredKnowledge.title);

    return {
      acquiredKnowledge,
    };
  };
};
