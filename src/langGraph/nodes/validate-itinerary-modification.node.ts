import { TripGraphState } from "@/langGraph/trip-graph.state";
import type { ItineraryModificationValidationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-validation.service";

export const createValidateItineraryModificationNode = (
  itineraryModificationValidationService: ItineraryModificationValidationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== VALIDATE ITINERARY MODIFICATION ==========");

    console.log("VALIDATION INPUT:", {
      tripId: state.tripId,
      threadId: state.threadId,
      pendingItineraryChange: state.pendingItineraryChange,
    });

    // STEP 1: Validate trip identification.

    if (!state.tripId || !state.threadId) {
      console.error("TRIP IDENTIFICATION FAILED");

      return {
        response: "I couldn't identify the current trip. Please try again.",

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        proposedItineraryDays: [],
        affectedDayNumbers: [],
      };
    }

    // STEP 2: Check whether modification details exist.

    if (!state.pendingItineraryChange) {
      console.error("PENDING ITINERARY CHANGE NOT FOUND");

      return {
        response:
          "I couldn't identify the changes you want to make. Please specify what you'd like to add, remove, or replace.",

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        proposedItineraryDays: [],
        affectedDayNumbers: [],
      };
    }

    // STEP 3: Validate the requested modification.

    console.log("CALLING ITINERARY MODIFICATION VALIDATION SERVICE");

    const result = await itineraryModificationValidationService.validateModification(
      state.tripId,
      state.threadId,
      state.pendingItineraryChange,
    );

    console.log("MODIFICATION VALIDATION RESULT:", {
      isValid: result.isValid,
      errors: result.errors,
    });

    // STEP 4: Handle validation failure.

    if (!result.isValid) {
      console.error("ITINERARY MODIFICATION VALIDATION FAILED");

      return {
        response: `I couldn't validate your itinerary changes:\n${result.errors
          .map((error) => `• ${error}`)
          .join("\n")}\n\nPlease review your request and try again.`,

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        // Remove any previous proposal.
        proposedItineraryDays: [],
        affectedDayNumbers: [],
      };
    }

    // STEP 5: Validation successful.
    // The next node will build the proposed itinerary and
    // assess its schedule and travel feasibility.

    console.log("ITINERARY MODIFICATION VALIDATION SUCCESSFUL");

    return {
      response:
        "Your requested itinerary changes have passed the initial validation. I'll check whether they fit your existing trip before making any changes.",

      itineraryRequested: true,
      itineraryAction: "MODIFY",
      confirmationStatus: null,

      pendingItineraryChange: state.pendingItineraryChange,

      modificationFeasibility: null,

      // Ensure the next node creates a fresh proposal.
      proposedItineraryDays: [],
      affectedDayNumbers: [],
    };
  };
};
