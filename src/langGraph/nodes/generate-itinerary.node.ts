import { ItineraryTemplateRetrievalService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-template-retrieval.service";

import type { TripGraphState } from "../trip-graph.state";

import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";

export const createGenerateItineraryNode = (
  itineraryTemplateRetrievalService: ItineraryTemplateRetrievalService,
  itineraryGenerationService: ItineraryGenerationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== GENERATE ITINERARY NODE STARTED ==========\n");

    try {
      // STEP 1: Check itinerary generation conditions

      console.log("STEP 1: CHECKING GENERATION CONDITIONS");

      console.log("GENERATION STATE:", {
        itineraryRequested: state.itineraryRequested,
        itineraryAction: state.itineraryAction,
        confirmationStatus: state.confirmationStatus,
      });

      if (
        state.confirmationStatus !== "CONFIRMED" ||
        !state.itineraryRequested ||
        state.itineraryAction !== "CREATE"
      ) {
        console.log("GENERATION CANCELLED: Confirmation conditions not satisfied");

        return {
          itineraryGeneratedNow: false,
          response: "Please confirm your itinerary request before proceeding.",
        };
      }

      const trip = state.tripRequirements;

      console.log("TRIP REQUIREMENTS:", JSON.stringify(trip, null, 2));

      // STEP 2: Construct RAG search query

      console.log("\nSTEP 2: CONSTRUCTING ITINERARY SEARCH QUERY");

      const query = [
        trip.source ? `Starting location: ${trip.source}.` : null,

        trip.destinations.length > 0
          ? `Destinations: ${trip.destinations.map((destination) => destination.name).join(", ")}.`
          : null,

        trip.totalDays !== null ? `Total duration: ${trip.totalDays} days.` : null,

        trip.numberOfTravelers !== null ? `Number of travelers: ${trip.numberOfTravelers}.` : null,

        trip.budget !== null ? `Total trip budget: ${trip.budget}.` : null,

        trip.travelMode ? `Travel mode: ${trip.travelMode}.` : null,

        trip.tripType ? `Trip type: ${trip.tripType}.` : null,

        trip.preferences.length > 0 ? `Preferences: ${trip.preferences.join(", ")}.` : null,

        trip.mustVisitPlaces.length > 0
          ? `Must-visit places: ${trip.mustVisitPlaces.join(", ")}.`
          : null,

        trip.preferredActivities.length > 0
          ? `Preferred activities: ${trip.preferredActivities.join(", ")}.`
          : null,

        trip.excludedPlaces.length > 0
          ? `Excluded places: ${trip.excludedPlaces.join(", ")}.`
          : null,

        trip.excludedActivityTypes.length > 0
          ? `Excluded activity types: ${trip.excludedActivityTypes.join(", ")}.`
          : null,

        trip.additionalDetails.length > 0
          ? `Additional requirements: ${trip.additionalDetails.join(", ")}.`
          : null,
      ]
        .filter((part): part is string => part !== null)
        .join("\n");

      if (!query.trim()) {
        console.log("GENERATION STOPPED: Empty search query");

        return {
          itineraryGeneratedNow: false,
          response:
            "I couldn't find enough trip details to search for a suitable itinerary. Please provide your trip requirements.",
        };
      }

      console.log("ITINERARY SEARCH QUERY:\n", query);

      // STEP 3: Retrieve itinerary templates

      console.log("\nSTEP 3: STARTING TEMPLATE RETRIEVAL");

      const retrievalStartTime = Date.now();

      const templates = await itineraryTemplateRetrievalService.retrieveTemplates(query, 5);

      console.log("TEMPLATE RETRIEVAL COMPLETED");

      console.log("RETRIEVED TEMPLATE COUNT:", templates.length);

      console.log("TEMPLATE RETRIEVAL TIME:", Date.now() - retrievalStartTime, "ms");

      // STEP 4: Validate retrieved templates

      console.log("\nSTEP 4: STARTING TEMPLATE VALIDATION");

      const validationResults = templates.map((template, index) => {
        console.log(`\nVALIDATING TEMPLATE ${index + 1}`);
        console.log("TEMPLATE TITLE:", template.title);

        const validation = itineraryGenerationService.validateItinerary(
          template.days,
          trip,
          template,
        );

        console.log(
          `TEMPLATE ${index + 1} VALIDATION RESULT:`,
          JSON.stringify(validation, null, 2),
        );

        return {
          template,
          validation,
        };
      });

      // Find the first valid template.

      const suitableTemplate = validationResults.find(
        (result) => result.validation.isValid,
      )?.template;

      console.log("\nSUITABLE TEMPLATE FOUND:", Boolean(suitableTemplate));

      // STEP 5: Reuse template or generate a fresh itinerary

      let generatedItinerary;

      if (suitableTemplate) {
        console.log("\nSTEP 5: REUSING VALIDATED TEMPLATE");

        generatedItinerary = {
          title: suitableTemplate.title,
          days: suitableTemplate.days,
        };

        console.log("VALIDATED TEMPLATE SELECTED:", suitableTemplate.title);
      } else {
        console.log("\nSTEP 5: NO SUITABLE TEMPLATE FOUND");

        console.log("STARTING FRESH ITINERARY GENERATION USING GROQ...");

        const generationStartTime = Date.now();

        try {
          generatedItinerary = await itineraryGenerationService.generateItinerary(trip, []);

          console.log("\nFRESH ITINERARY GENERATED SUCCESSFULLY");

          console.log("ITINERARY GENERATION TIME:", Date.now() - generationStartTime, "ms");
        } catch (error) {
          console.error("\nFRESH ITINERARY GENERATION FAILED");

          console.error("GENERATION ERROR:", error);

          if (error instanceof Error) {
            console.error("ERROR NAME:", error.name);
            console.error("ERROR MESSAGE:", error.message);
            console.error("ERROR STACK:", error.stack);
          }

          throw error;
        }
      }

      // STEP 6: Log final itinerary

      console.log("\nSTEP 6: FINAL GENERATED ITINERARY");

      console.log(JSON.stringify(generatedItinerary, null, 2));

      // STEP 7: Return generated itinerary to graph state

      console.log("\nSTEP 7: UPDATING GRAPH STATE");

      console.log("ITINERARY GENERATION COMPLETED SUCCESSFULLY");

      console.log("\n========== GENERATE ITINERARY NODE FINISHED ==========\n");

      return {
        generatedItinerary,
        itineraryGeneratedNow: true,
        response: "Itinerary generated successfully.",
      };
    } catch (error) {
      console.error("\n========== GENERATE ITINERARY NODE FAILED ==========");

      console.error("ERROR DETAILS:", error);

      if (error instanceof Error) {
        console.error("ERROR NAME:", error.name);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR STACK:", error.stack);
      }

      console.error("========== END OF GENERATION ERROR ==========\n");

      // Allow LangGraph's error handling to handle the exception.
      throw error;
    }
  };
};
