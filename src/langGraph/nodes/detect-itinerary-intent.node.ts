import { ItineraryIntentService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-intent.service";
import type { TripGraphState } from "../trip-graph.state";

export const createDetectItineraryIntentNode = (itineraryIntentService: ItineraryIntentService) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== DETECT ITINERARY INTENT ==========");

    console.log("CURRENT ITINERARY STATE:", {
      threadId: state.threadId,
      userMessage: state.userMessage,
      itineraryRequested: state.itineraryRequested,
      itineraryAction: state.itineraryAction,
      confirmationStatus: state.confirmationStatus,
      pendingItineraryChange: state.pendingItineraryChange,
      modificationFeasibility: state.modificationFeasibility,
      proposedItineraryDays: state.proposedItineraryDays.length,
      affectedDayNumbers: state.affectedDayNumbers,
      modificationClarificationRequested: state.modificationClarificationRequested,
      recommendationRequested: state.recommendationRequested,
      recommendationDayNumber: state.recommendationDayNumber,
    });

    // Prepare conversation history for recommendation detection.

    const conversationHistory = state.conversationHistory
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    // ============================================================
    // STEP 1: HANDLE PENDING MODIFICATION CONFIRMATION
    // ============================================================

    const isPendingModificationConfirmation =
      state.itineraryRequested === true &&
      state.itineraryAction === "MODIFY" &&
      state.confirmationStatus === "PENDING" &&
      state.pendingItineraryChange !== null &&
      state.modificationFeasibility !== null;

    if (isPendingModificationConfirmation) {
      console.log("HANDLING PENDING MODIFICATION CONFIRMATION");

      const result = await itineraryIntentService.interpretModificationResponse(state.userMessage);

      console.log("MODIFICATION RESPONSE INTERPRETATION:", result);

      // ------------------------------------------------------------
      // 1A. USER CONFIRMED MODIFICATION
      // ------------------------------------------------------------

      if (result.intent === "CONFIRM") {
        console.log("USER CONFIRMED ITINERARY MODIFICATION");

        return {
          response: result.message,

          itineraryRequested: true,
          itineraryAction: "MODIFY",
          confirmationStatus: "CONFIRMED",

          // Preserve the exact proposal that was assessed.
          pendingItineraryChange: state.pendingItineraryChange,
          modificationFeasibility: state.modificationFeasibility,
          proposedItineraryDays: state.proposedItineraryDays,
          affectedDayNumbers: state.affectedDayNumbers,

          modificationClarificationRequested: false,
        };
      }

      // ------------------------------------------------------------
      // 1B. USER REJECTED MODIFICATION
      // ------------------------------------------------------------

      if (result.intent === "REJECT") {
        console.log("USER REJECTED ITINERARY MODIFICATION");

        return {
          response:
            result.message || "No problem. Your original saved itinerary remains unchanged.",

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: "REJECTED",

          // Clear the rejected modification.
          pendingItineraryChange: null,
          modificationFeasibility: null,
          proposedItineraryDays: [],
          affectedDayNumbers: [],

          modificationClarificationRequested: false,

          recommendationRequested: false,
          recommendationDayNumber: null,
          recommendedAttractions: [],
        };
      }

      // ------------------------------------------------------------
      // 1C. USER REQUESTED ADDITIONAL MODIFICATIONS
      // ------------------------------------------------------------

      if (result.intent === "MODIFY") {
        console.log("USER REQUESTED CHANGES TO THE PROPOSAL");

        if (!result.updatedRequest?.trim()) {
          return {
            response:
              "Could you please describe what you would like to change in the proposed itinerary?",

            itineraryRequested: true,
            itineraryAction: "MODIFY",
            confirmationStatus: "PENDING",

            pendingItineraryChange: state.pendingItineraryChange,
            modificationFeasibility: state.modificationFeasibility,
            proposedItineraryDays: state.proposedItineraryDays,
            affectedDayNumbers: state.affectedDayNumbers,

            modificationClarificationRequested: false,
          };
        }

        // Extract the newly requested modifications.
        const updatedChange = await itineraryIntentService.extractModification(
          result.updatedRequest,
          state.recommendedAttractions,
        );

        console.log("UPDATED ITINERARY MODIFICATION:", JSON.stringify(updatedChange, null, 2));

        return {
          response: "I've understood your additional changes. Let me reassess the itinerary.",

          itineraryRequested: true,
          itineraryAction: "MODIFY",
          confirmationStatus: null,

          // Replace the previous pending modification.
          pendingItineraryChange: updatedChange,

          // Previous feasibility assessment is no longer valid.
          modificationFeasibility: null,

          // A new proposal must be generated.
          proposedItineraryDays: [],
          affectedDayNumbers: [],

          modificationClarificationRequested: false,

          recommendationRequested: false,
          recommendationDayNumber: null,
          recommendedAttractions: [],
        };
      }

      // ------------------------------------------------------------
      // 1D. USER ASKS A CLARIFICATION QUESTION
      // ------------------------------------------------------------

      if (result.intent === "CLARIFY") {
        console.log("USER NEEDS CLARIFICATION");

        // Check whether the user is actually requesting
        // attraction recommendations.
        const recommendation = await itineraryIntentService.detectRecommendationRequest(
          state.userMessage,
          conversationHistory,
        );

        console.log("RECOMMENDATION INTENT WHILE MODIFICATION IS PENDING:", recommendation);

        // ----------------------------------------------------------
        // 1D-1. ATTRACTION RECOMMENDATION REQUEST
        // ----------------------------------------------------------

        if (recommendation.recommendationRequested) {
          console.log("ROUTING TO ATTRACTION RECOMMENDATIONS");

          return {
            recommendationRequested: true,
            recommendationDayNumber: recommendation.dayNumber,
            recommendedAttractions: [],

            // Preserve the pending modification.
            itineraryRequested: true,
            itineraryAction: "MODIFY",
            confirmationStatus: "PENDING",

            pendingItineraryChange: state.pendingItineraryChange,
            modificationFeasibility: state.modificationFeasibility,
            proposedItineraryDays: state.proposedItineraryDays,
            affectedDayNumbers: state.affectedDayNumbers,

            modificationClarificationRequested: false,
          };
        }

        // ----------------------------------------------------------
        // 1D-2. NORMAL MODIFICATION CLARIFICATION
        // ----------------------------------------------------------

        console.log("ROUTING TO MODIFICATION CLARIFICATION");

        return {
          // The dedicated clarification node will generate
          // the actual response.
          response: "",

          itineraryRequested: true,
          itineraryAction: "MODIFY",
          confirmationStatus: "PENDING",

          // Preserve the existing proposal and its assessment.
          pendingItineraryChange: state.pendingItineraryChange,
          modificationFeasibility: state.modificationFeasibility,
          proposedItineraryDays: state.proposedItineraryDays,
          affectedDayNumbers: state.affectedDayNumbers,

          modificationClarificationRequested: true,
        };
      }
    }

    // ============================================================
    // STEP 2: HANDLE OTHER PENDING ITINERARY CONFIRMATIONS
    // ============================================================

    if (state.itineraryRequested === true && state.confirmationStatus === "PENDING") {
      console.log("HANDLING PENDING ITINERARY CONFIRMATION");

      // This is the existing YES/NO confirmation flow for creation.
      const confirmation = await itineraryIntentService.detectConfirmation(state.userMessage);

      console.log("USER CONFIRMATION:", confirmation);

      // ------------------------------------------------------------
      // 2A. USER CONFIRMED
      // ------------------------------------------------------------

      if (confirmation === "YES") {
        console.log("USER CONFIRMED ITINERARY REQUEST");

        return {
          itineraryRequested: true,
          itineraryAction: state.itineraryAction,
          confirmationStatus: "CONFIRMED",

          pendingItineraryChange: state.pendingItineraryChange,
          modificationFeasibility: state.modificationFeasibility,
          proposedItineraryDays: state.proposedItineraryDays,
          affectedDayNumbers: state.affectedDayNumbers,

          modificationClarificationRequested: false,
        };
      }

      // ------------------------------------------------------------
      // 2B. USER REJECTED
      // ------------------------------------------------------------

      if (confirmation === "NO") {
        console.log("USER REJECTED ITINERARY REQUEST");

        return {
          response: "No problem. We can make changes to your trip requirements before proceeding.",

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: "REJECTED",

          pendingItineraryChange: null,
          modificationFeasibility: null,
          proposedItineraryDays: [],
          affectedDayNumbers: [],

          modificationClarificationRequested: false,
        };
      }

      // ------------------------------------------------------------
      // 2C. CHECK FOR RECOMMENDATION REQUEST
      // ------------------------------------------------------------

      const recommendation = await itineraryIntentService.detectRecommendationRequest(
        state.userMessage,
        conversationHistory,
      );

      console.log("RECOMMENDATION INTENT WHILE ITINERARY CONFIRMATION IS PENDING:", recommendation);

      if (recommendation.recommendationRequested) {
        return {
          recommendationRequested: true,
          recommendationDayNumber: recommendation.dayNumber,
          recommendedAttractions: [],

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          pendingItineraryChange: null,
          modificationFeasibility: null,
          proposedItineraryDays: [],
          affectedDayNumbers: [],

          modificationClarificationRequested: false,
        };
      }

      // ------------------------------------------------------------
      // 2D. CHECK FOR A NEW ITINERARY REQUEST
      // ------------------------------------------------------------

      const newIntent = await itineraryIntentService.detectIntent(state.userMessage);

      console.log("NEW ITINERARY INTENT:", newIntent);

      if (newIntent.itineraryRequested) {
        // A new modification needs its own extracted changes.
        if (newIntent.itineraryAction === "MODIFY") {
          const change = await itineraryIntentService.extractModification(
            state.userMessage,
            state.recommendedAttractions,
          );

          return {
            itineraryRequested: true,
            itineraryAction: "MODIFY",
            confirmationStatus: null,

            pendingItineraryChange: change,
            modificationFeasibility: null,
            proposedItineraryDays: [],
            affectedDayNumbers: [],

            modificationClarificationRequested: false,

            recommendationRequested: false,
            recommendationDayNumber: null,
            recommendedAttractions: [],
          };
        }

        // A new creation request replaces the previous request.
        if (newIntent.itineraryAction === "CREATE") {
          return {
            itineraryRequested: true,
            itineraryAction: "CREATE",
            confirmationStatus: null,

            pendingItineraryChange: null,
            modificationFeasibility: null,
            proposedItineraryDays: [],
            affectedDayNumbers: [],

            modificationClarificationRequested: false,

            recommendationRequested: false,
            recommendationDayNumber: null,
            recommendedAttractions: [],
          };
        }
      }

      // ------------------------------------------------------------
      // 2E. CONFIRMATION STILL PENDING
      // ------------------------------------------------------------

      return {
        response:
          "Would you like me to proceed with generating your itinerary? Please confirm or tell me what you would like to change about your trip.",

        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: "PENDING",

        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: state.modificationFeasibility,
        proposedItineraryDays: state.proposedItineraryDays,
        affectedDayNumbers: state.affectedDayNumbers,

        modificationClarificationRequested: false,
      };
    }

    // ============================================================
    // STEP 3: DETECT ATTRACTION RECOMMENDATIONS FIRST
    // ============================================================

    const recommendation = await itineraryIntentService.detectRecommendationRequest(
      state.userMessage,
      conversationHistory,
    );

    console.log("ATTRACTION RECOMMENDATION INTENT:", recommendation);

    if (recommendation.recommendationRequested) {
      console.log("ATTRACTION RECOMMENDATION REQUEST DETECTED");

      return {
        recommendationRequested: true,
        recommendationDayNumber: recommendation.dayNumber,
        recommendedAttractions: [],

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,
        proposedItineraryDays: [],
        affectedDayNumbers: [],

        modificationClarificationRequested: false,
      };
    }

    // ============================================================
    // STEP 4: DETECT ITINERARY CREATION OR MODIFICATION
    // ============================================================

    const result = await itineraryIntentService.detectIntent(state.userMessage);

    console.log("ITINERARY INTENT RESULT:", result);

    // ------------------------------------------------------------
    // 4A. HANDLE ITINERARY MODIFICATION
    // ------------------------------------------------------------

    if (result.itineraryRequested && result.itineraryAction === "MODIFY") {
      console.log("ITINERARY MODIFICATION REQUEST DETECTED");

      const change = await itineraryIntentService.extractModification(
        state.userMessage,
        state.recommendedAttractions,
      );

      console.log("EXTRACTED ITINERARY MODIFICATION:", JSON.stringify(change, null, 2));

      return {
        itineraryRequested: true,
        itineraryAction: "MODIFY",
        confirmationStatus: null,

        pendingItineraryChange: change,
        modificationFeasibility: null,

        // Clear any previous proposal.
        proposedItineraryDays: [],
        affectedDayNumbers: [],

        modificationClarificationRequested: false,

        recommendationRequested: false,
        recommendationDayNumber: null,
        recommendedAttractions: [],
      };
    }

    // ------------------------------------------------------------
    // 4B. HANDLE ITINERARY CREATION
    // ------------------------------------------------------------

    if (result.itineraryRequested && result.itineraryAction === "CREATE") {
      console.log("ITINERARY CREATION REQUEST DETECTED");

      return {
        itineraryRequested: true,
        itineraryAction: "CREATE",
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        proposedItineraryDays: [],
        affectedDayNumbers: [],

        modificationClarificationRequested: false,

        recommendationRequested: false,
        recommendationDayNumber: null,
        recommendedAttractions: [],
      };
    }

    // ============================================================
    // STEP 5: CLEAR COMPLETED CONFIRMATION STATE
    // ============================================================

    if (state.itineraryRequested && state.confirmationStatus === "CONFIRMED") {
      console.log("CLEARING COMPLETED ITINERARY CONFIRMATION");

      return {
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,
        proposedItineraryDays: [],
        affectedDayNumbers: [],

        modificationClarificationRequested: false,
      };
    }

    // ============================================================
    // STEP 6: PRESERVE AN EXISTING ITINERARY REQUEST
    // ============================================================

    if (state.itineraryRequested) {
      console.log("PRESERVING EXISTING ITINERARY REQUEST");

      return {
        itineraryRequested: true,
        itineraryAction: state.itineraryAction,
        confirmationStatus: state.confirmationStatus,

        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: state.modificationFeasibility,
        proposedItineraryDays: state.proposedItineraryDays,
        affectedDayNumbers: state.affectedDayNumbers,

        modificationClarificationRequested: false,
      };
    }

    // ============================================================
    // STEP 7: CONTINUE NORMAL TRIP-PLANNING CONVERSATION
    // ============================================================

    console.log("NO ITINERARY OR RECOMMENDATION INTENT DETECTED");

    return {
      itineraryRequested: false,
      itineraryAction: null,

      recommendationRequested: false,
      recommendationDayNumber: null,
      recommendedAttractions: [],

      confirmationStatus: null,

      pendingItineraryChange: null,
      modificationFeasibility: null,
      proposedItineraryDays: [],
      affectedDayNumbers: [],

      modificationClarificationRequested: false,
    };
  };
};
