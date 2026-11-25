import type { TripGraphState } from "@/langGraph/trip-graph.state";

import type { IItineraryDay } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";

import { ItineraryModificationFeasibilityService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-feasibility.service";

import { ItineraryModificationBuilderService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-builder.service";

import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

// ==================================================
// HELPER: FORMAT AFFECTED DAY PREVIEW
// ==================================================

const formatDayPreview = (day: IItineraryDay): string[] => {
  const lines: string[] = [];

  lines.push(`**Day ${day.dayNumber}: ${day.title}**`);

  if (day.description) {
    lines.push(day.description);
  }

  lines.push("");

  day.stops.forEach((stop, index) => {
    lines.push(`${index + 1}. **${stop.name}**`);

    if (stop.description) {
      lines.push(`   ${stop.description}`);
    }

    const details: string[] = [];

    if (stop.startTime) {
      details.push(stop.startTime);
    }

    if (stop.durationMinutes !== undefined) {
      details.push(`${stop.durationMinutes} minutes`);
    }

    if (stop.location) {
      details.push(stop.location);
    }

    if (details.length > 0) {
      lines.push(`   ${details.join(" | ")}`);
    }

    lines.push("");
  });

  return lines;
};

// ==================================================
// CHECK ITINERARY MODIFICATION FEASIBILITY NODE
// ==================================================

export const createCheckItineraryModificationFeasibilityNode = (
  itineraryService: IItineraryService,
  feasibilityService: ItineraryModificationFeasibilityService,
  modificationBuilderService: ItineraryModificationBuilderService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== CHECK ITINERARY MODIFICATION FEASIBILITY ==========");

    let currentStep = "INITIALIZATION";

    try {
      // ==================================================
      // STEP 1: VALIDATE TRIP IDENTIFICATION
      // ==================================================

      currentStep = "VALIDATING_TRIP_IDENTIFICATION";

      console.log("STEP 1: VALIDATING TRIP IDENTIFICATION");

      if (!state.tripId || !state.threadId) {
        throw new Error("Missing tripId or threadId.");
      }

      // ==================================================
      // STEP 2: VALIDATE PENDING MODIFICATION
      // ==================================================

      currentStep = "VALIDATING_PENDING_MODIFICATION";

      console.log("STEP 2: VALIDATING PENDING MODIFICATION");

      if (!state.pendingItineraryChange) {
        throw new Error("Pending itinerary change is missing.");
      }

      console.log(
        "PENDING ITINERARY CHANGE:",
        JSON.stringify(state.pendingItineraryChange, null, 2),
      );

      // ==================================================
      // STEP 3: RETRIEVE EXISTING ITINERARY
      // ==================================================

      currentStep = "RETRIEVING_EXISTING_ITINERARY";

      console.log("STEP 3: RETRIEVING EXISTING ITINERARY");

      const itinerary = await itineraryService.getItineraryByTripId(state.tripId, state.threadId);

      if (!itinerary) {
        console.log("EXISTING ITINERARY NOT FOUND");

        return {
          response:
            "I couldn't find a saved itinerary for this trip. Please generate an itinerary before requesting modifications.",

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

      console.log("EXISTING ITINERARY RETRIEVED:", {
        title: itinerary.title,
        totalDays: itinerary.totalDays,
        travelMode: itinerary.travelMode,
        startDate: itinerary.startDate,
        daysCount: itinerary.days.length,
      });

      // ==================================================
      // STEP 4: BUILD PROPOSED ITINERARY
      // ==================================================

      currentStep = "BUILDING_PROPOSED_ITINERARY";

      console.log("STEP 4: BUILDING PROPOSED ITINERARY");

      const preview = await modificationBuilderService.buildProposedItinerary(
        itinerary,
        state.pendingItineraryChange,
      );

      console.log("PROPOSED ITINERARY BUILT:", {
        proposedDaysCount: preview.proposedDays.length,
        affectedDayNumbers: preview.affectedDayNumbers,
        schedulingIssues: preview.schedulingIssues,
      });

      console.log("PROPOSED DAYS:", JSON.stringify(preview.proposedDays, null, 2));

      // ==================================================
      // STEP 5: VALIDATE PROPOSAL OUTPUT
      // ==================================================

      currentStep = "VALIDATING_PROPOSED_ITINERARY";

      console.log("STEP 5: VALIDATING PROPOSED ITINERARY");

      if (preview.proposedDays.length === 0 || preview.affectedDayNumbers.length === 0) {
        console.error("INVALID PROPOSED ITINERARY OUTPUT", {
          proposedDaysCount: preview.proposedDays.length,
          affectedDayNumbers: preview.affectedDayNumbers,
        });

        return {
          response:
            "I couldn't prepare a valid preview of your requested changes. Your saved itinerary has not been modified. Please review your request and try again.",

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

      // ==================================================
      // STEP 6: HANDLE SCHEDULING CONFLICTS
      // ==================================================

      currentStep = "CHECKING_SCHEDULING_CONFLICTS";

      console.log("STEP 6: CHECKING SCHEDULING CONFLICTS");

      if (preview.schedulingIssues.length > 0) {
        console.log("SCHEDULING CONFLICTS DETECTED:", preview.schedulingIssues);

        const response = [
          "I tried to prepare your requested itinerary changes, but some attractions cannot fit into the selected day's schedule.",
          "",
          "### Scheduling issues:",
          ...preview.schedulingIssues.map((issue) => `• ${issue}`),
          "",
          "### What can you do?",
          "You could remove one or more existing attractions from that day to make room for the new attraction.",
          "",
          "Please tell me which attraction you would like to remove or what other changes you would prefer.",
          "",
          "Your saved itinerary has not been modified.",
        ].join("\n");

        return {
          response,

          // Stop the current modification process.
          // The user can submit a revised modification request.
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          // Clear the unsuccessful modification.
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

      console.log("NO SCHEDULING CONFLICTS DETECTED");

      // ==================================================
      // STEP 7: ASSESS MODIFICATION FEASIBILITY
      // ==================================================

      currentStep = "ASSESSING_MODIFICATION_FEASIBILITY";

      console.log("STEP 7: ASSESSING MODIFICATION FEASIBILITY");

      const feasibility = await feasibilityService.assessFeasibility(
        itinerary,
        state.pendingItineraryChange,
        preview.proposedDays,
        preview.affectedDayNumbers,
      );

      console.log("FEASIBILITY ASSESSMENT RESULT:", {
        status: feasibility.status,
        summary: feasibility.summary,
        concerns: feasibility.concerns,
        proposedChanges: feasibility.proposedChanges,
        requiresAdditionalDays: feasibility.requiresAdditionalDays,
      });

      // ==================================================
      // STEP 8: HANDLE NOT FEASIBLE RESULT
      // ==================================================

      currentStep = "HANDLING_FEASIBILITY_RESULT";

      if (feasibility.status === "NOT_FEASIBLE") {
        console.log("MODIFICATION IS NOT FEASIBLE");

        const response = [
          "I couldn't fit the requested changes into your current itinerary.",
          "",
          "### Feasibility assessment:",
          feasibility.summary,

          ...(feasibility.concerns.length > 0
            ? [
                "",
                "### Additional concerns:",
                ...feasibility.concerns.map((concern) => `• ${concern}`),
              ]
            : []),

          ...(feasibility.requiresAdditionalDays
            ? ["", "The proposed changes may require additional days."]
            : []),

          "",
          "You can revise your request and try again.",
          "",
          "Your saved itinerary has not been modified.",
        ].join("\n");

        return {
          response,

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          pendingItineraryChange: null,
          modificationFeasibility: feasibility,

          proposedItineraryDays: [],
          affectedDayNumbers: [],

          modificationClarificationRequested: false,

          recommendationRequested: false,
          recommendationDayNumber: null,
          recommendedAttractions: [],
        };
      }

      // ==================================================
      // STEP 9: PREPARE AFFECTED-DAY PREVIEW
      // ==================================================

      currentStep = "PREPARING_AFFECTED_DAY_PREVIEW";

      console.log("STEP 9: PREPARING AFFECTED-DAY PREVIEW");

      const affectedDays = preview.proposedDays.filter((day) =>
        preview.affectedDayNumbers.includes(day.dayNumber),
      );

      console.log("AFFECTED DAY PREVIEW:", JSON.stringify(affectedDays, null, 2));

      const formattedDays = affectedDays.flatMap((day) => formatDayPreview(day));

      // ==================================================
      // STEP 10: PREPARE FEASIBILITY MESSAGE
      // ==================================================

      currentStep = "PREPARING_FEASIBILITY_RESPONSE";

      console.log("STEP 10: PREPARING FEASIBILITY RESPONSE");

      const feasibilityHeading =
        feasibility.status === "NEEDS_CONFIRMATION"
          ? "### Important: Your review is required"
          : "### Feasibility assessment";

      const feasibilityIntroduction =
        feasibility.status === "NEEDS_CONFIRMATION"
          ? "The proposed changes have some scheduling considerations that need your attention."
          : "The requested changes appear manageable within your existing itinerary.";

      const response = [
        "I've prepared a revised version of your itinerary.",
        "",
        "### Proposed changes:",
        ...(feasibility.proposedChanges.length > 0
          ? feasibility.proposedChanges.map((change) => `• ${change}`)
          : ["No specific proposed changes were returned."]),
        "",
        "### Your updated itinerary:",
        "",
        ...formattedDays,
        feasibilityHeading,
        feasibilityIntroduction,
        "",
        feasibility.summary,

        ...(feasibility.concerns.length > 0
          ? [
              "",
              "### Things to consider:",
              ...feasibility.concerns.map((concern) => `• ${concern}`),
            ]
          : []),

        ...(feasibility.requiresAdditionalDays
          ? ["", "These changes may require additional days."]
          : []),

        "",
        "Would you like me to apply these changes to your saved itinerary?",
        "",
        "Please answer yes or no.",
        "",
        "Your saved itinerary has not been modified yet.",
      ].join("\n");

      // ==================================================
      // STEP 11: STORE PROPOSED ITINERARY
      // ==================================================

      currentStep = "STORING_PROPOSED_ITINERARY";

      console.log("STEP 11: STORING PROPOSED ITINERARY FOR CONFIRMATION");

      console.log("MODIFICATION PROPOSAL SUMMARY:", {
        feasibilityStatus: feasibility.status,
        affectedDayNumbers: preview.affectedDayNumbers,
        proposedDaysCount: preview.proposedDays.length,
        affectedDaysCount: affectedDays.length,
      });

      return {
        response,

        itineraryRequested: true,
        itineraryAction: "MODIFY",
        confirmationStatus: "PENDING",

        pendingItineraryChange: state.pendingItineraryChange,
        modificationFeasibility: feasibility,

        proposedItineraryDays: preview.proposedDays,
        affectedDayNumbers: preview.affectedDayNumbers,

        modificationClarificationRequested: false,
      };
    } catch (error) {
      // ==================================================
      // STEP 12: HANDLE UNEXPECTED ERRORS
      // ==================================================

      console.error("\n========== MODIFICATION FEASIBILITY ERROR ==========");

      console.error("FAILED AT STEP:", currentStep);

      if (error instanceof Error) {
        console.error("ERROR NAME:", error.name);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR STACK:", error.stack);
      } else {
        console.error("UNKNOWN ERROR:", error);
      }

      console.error("====================================================\n");

      return {
        response:
          "I couldn't complete the assessment of your requested changes due to an unexpected error. Your saved itinerary has not been modified. Please try again.",

        itineraryRequested: false,
        itineraryAction: null,
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
  };
};
