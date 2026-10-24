import { ItineraryTemplateRetrievalService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-template-retrieval.service";

import type { TripGraphState } from "../trip-graph.state";
import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";

export const createGenerateItineraryNode = (
  itineraryTemplateRetrievalService: ItineraryTemplateRetrievalService,
  itineraryGenerationService: ItineraryGenerationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("GENERATE ITINERARY NODE:", {
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
      confirmationStatus: state.confirmationStatus,
      tripRequirements: state.tripRequirements,
    });

    // Ensure the user has confirmed itinerary creation.
    if (
      state.confirmationStatus !== "CONFIRMED" ||
      !state.itineraryRequested ||
      state.itineraryAction !== "CREATE"
    ) {
      return {
        itineraryGeneratedNow: false,
        response: "Please confirm your itinerary request before proceeding.",
      };
    }

    const trip = state.tripRequirements;

    // Construct a search query from the collected trip requirements.
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

      trip.excludedPlaces.length > 0 ? `Excluded places: ${trip.excludedPlaces.join(", ")}.` : null,

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
      return {
        itineraryGeneratedNow: false,
        response:
          "I couldn't find enough trip details to search for a suitable itinerary. Please provide your trip requirements.",
      };
    }

    console.log("ITINERARY SEARCH QUERY:", query);

    // Retrieve complete templates matching the trip requirements.
    const templates = await itineraryTemplateRetrievalService.retrieveTemplates(query, 5);

    console.log("RETRIEVED ITINERARY TEMPLATES:", templates.length);

    const suitableTemplate = templates.find(
      (template) =>
        itineraryGenerationService.validateItinerary(template.days, trip, template).isValid,
    );

    const generatedItinerary = suitableTemplate
      ? {
          title: suitableTemplate.title,
          days: suitableTemplate.days,
        }
      : await itineraryGenerationService.generateItinerary(trip, []);

    console.log(
      suitableTemplate ? "REUSED VALIDATED ITINERARY TEMPLATE:" : "GENERATED ITINERARY:",
      generatedItinerary,
    );

    return {
      generatedItinerary,
      itineraryGeneratedNow: true,
      response: "Itinerary generated successfully.",
    };
  };
};
