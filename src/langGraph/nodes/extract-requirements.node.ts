import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import type { TripGraphState } from "../trip-graph.state";

//Extract trip requirements from the user's message.
export const createExtractRequirementsNode = (tripExtractionService: TripExtractionService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const extractionResult = await tripExtractionService.extractTripRequirements(
      state.userMessage,
      state.conversationHistory,
      state.currentKnowledgeDestination,
    );

    return {
      title: extractionResult.title,
      tripRequirements: extractionResult.requirements,
      missingFields: extractionResult.missingFields,
      destinationOrderChanged: extractionResult.destinationOrderChanged,
      currentKnowledgeDestination: extractionResult.knowledgeDestination,
    };
  };
};
