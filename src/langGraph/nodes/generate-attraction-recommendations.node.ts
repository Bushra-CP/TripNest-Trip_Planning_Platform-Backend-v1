import type { TripGraphState } from "../trip-graph.state";
import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";
import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";

export const createGenerateAttractionRecommendationsNode = (
  itineraryService: IItineraryService,
  itineraryGenerationService: ItineraryGenerationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    try {
      console.log("GENERATING ATTRACTION RECOMMENDATIONS:", {
        tripId: state.tripId,
        threadId: state.threadId,
        dayNumber: state.recommendationDayNumber,
        destination: state.currentKnowledgeDestination,
      });

      // --------------------------------------------------
      // CASE 1: RECOMMENDATIONS FOR A SPECIFIC ITINERARY DAY
      // --------------------------------------------------

      if (state.recommendationDayNumber !== null) {
        if (!state.tripId || !state.threadId) {
          return {
            response: "I couldn't identify your current trip. Please try again.",
            recommendationRequested: false,
          };
        }

        const itinerary = await itineraryService.getItineraryByTripId(state.tripId, state.threadId);

        if (!itinerary) {
          return {
            response:
              "I couldn't find a saved itinerary for your trip. Please generate an itinerary first.",
            recommendationRequested: false,
            recommendationDayNumber: null,
            recommendedAttractions: [],
          };
        }

        const result = await itineraryGenerationService.generateAttractionRecommendations(
          itinerary,
          state.recommendationDayNumber,
        );

        const recommendationList = result.recommendations
          .map(
            (attraction, index) =>
              `${index + 1}. ${attraction.name}\n` +
              `   ${attraction.description}\n` +
              `   Why visit: ${attraction.reason}`,
          )
          .join("\n\n");

        return {
          response: [
            `Here are some attractions and activities you could consider for Day ${result.dayNumber}:`,
            "",
            recommendationList,
            "",
            "Would you like to add any of these attractions to your itinerary? You can select one by its name.",
          ].join("\n"),

          recommendationRequested: false,
          recommendationDayNumber: result.dayNumber,
          recommendedAttractions: result.recommendations.map((attraction) => ({
            name: attraction.name,
            reason: attraction.reason,
          })),
        };
      }

      // --------------------------------------------------
      // CASE 2: RECOMMENDATIONS FOR A DESTINATION
      // --------------------------------------------------

      const destination = state.currentKnowledgeDestination?.trim();

      if (destination) {
        const result =
          await itineraryGenerationService.generateAttractionRecommendationsForDestination(
            destination,
          );

        const recommendationList = result.recommendations
          .map(
            (attraction, index) =>
              `${index + 1}. ${attraction.name}\n` +
              `   ${attraction.description}\n` +
              `   Why visit: ${attraction.reason}`,
          )
          .join("\n\n");

        return {
          response: [
            `Here are some attractions and activities you can explore in ${result.destination}:`,
            "",
            recommendationList,
            "",
            "Would you like to know more about any of these places?",
          ].join("\n"),

          recommendationRequested: false,
          recommendationDayNumber: null,
          recommendedAttractions: result.recommendations.map((attraction) => ({
            name: attraction.name,
            reason: attraction.reason,
          })),
        };
      }

      // --------------------------------------------------
      // CASE 3: NEITHER DAY NOR DESTINATION IS AVAILABLE
      // --------------------------------------------------

      return {
        response: "Which destination or itinerary day would you like recommendations for?",
        recommendationRequested: false,
        recommendationDayNumber: null,
        recommendedAttractions: [],
      };
    } catch (error) {
      console.error("GENERATE ATTRACTION RECOMMENDATIONS ERROR:", error);

      return {
        response:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating attraction recommendations. Please try again.",

        recommendationRequested: false,
        recommendationDayNumber: null,
        recommendedAttractions: [],
      };
    }
  };
};
