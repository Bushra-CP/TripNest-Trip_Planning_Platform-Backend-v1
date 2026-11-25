import type { TripGraphState } from "@/langGraph/trip-graph.state";

import type { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";

import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

import type { ItineraryModificationValidationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-validation.service";

export const createApplyItineraryModificationNode = (
  itineraryService: IItineraryService,
  validationService: ItineraryModificationValidationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== APPLY ITINERARY MODIFICATION ==========");

    try {
      // ==================================================
      // STEP 1: CHECK CONFIRMATION AND REQUIRED STATE
      // ==================================================

      console.log("CHECKING MODIFICATION STATE:", {
        confirmationStatus: state.confirmationStatus,
        itineraryRequested: state.itineraryRequested,
        itineraryAction: state.itineraryAction,
        hasPendingChange: Boolean(state.pendingItineraryChange),
        feasibilityStatus: state.modificationFeasibility?.status,
        proposedDaysCount: state.proposedItineraryDays.length,
        affectedDayNumbers: state.affectedDayNumbers,
      });

      if (
        state.confirmationStatus !== "CONFIRMED" ||
        !state.itineraryRequested ||
        state.itineraryAction !== "MODIFY" ||
        !state.pendingItineraryChange ||
        !state.modificationFeasibility ||
        !["FEASIBLE", "NEEDS_CONFIRMATION"].includes(state.modificationFeasibility.status) ||
        state.proposedItineraryDays.length === 0 ||
        state.affectedDayNumbers.length === 0
      ) {
        console.error("REQUIRED MODIFICATION STATE IS MISSING");

        return {
          response:
            "I haven't changed your saved itinerary because the required confirmation or proposed itinerary is missing.",

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          pendingItineraryChange: null,
          modificationFeasibility: null,

          proposedItineraryDays: [],
          affectedDayNumbers: [],
        };
      }

      // ==================================================
      // STEP 2: CHECK TRIP IDENTIFIERS
      // ==================================================

      if (!state.tripId || !state.threadId) {
        console.error("TRIP IDENTIFIERS ARE MISSING");

        return {
          response:
            "I couldn't identify your current trip. Your saved itinerary has not been modified.",

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          pendingItineraryChange: null,
          modificationFeasibility: null,

          proposedItineraryDays: [],
          affectedDayNumbers: [],
        };
      }

      const changes: PendingItineraryChange = state.pendingItineraryChange;

      console.log("PENDING ITINERARY CHANGE:", JSON.stringify(changes, null, 2));

      console.log("PROPOSED ITINERARY DAYS:", JSON.stringify(state.proposedItineraryDays, null, 2));

      // ==================================================
      // STEP 3: REVALIDATE THE MODIFICATION
      // ==================================================

      console.log("REVALIDATING ITINERARY MODIFICATION");

      const validation = await validationService.validateModification(
        state.tripId,
        state.threadId,
        changes,
      );

      console.log("MODIFICATION VALIDATION RESULT:", {
        isValid: validation.isValid,
        errors: validation.errors,
        hasItinerary: Boolean(validation.itinerary),
      });

      if (!validation.isValid || !validation.itinerary) {
        console.error("MODIFICATION REVALIDATION FAILED");

        return {
          response: [
            "I couldn't apply the requested changes because the itinerary no longer satisfies the validation checks.",
            ...validation.errors.map((error) => `• ${error}`),
            "",
            "Your saved itinerary has not been modified. Please review your request and try again.",
          ].join("\n"),

          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,

          pendingItineraryChange: null,
          modificationFeasibility: null,

          proposedItineraryDays: [],
          affectedDayNumbers: [],
        };
      }

      const itinerary = validation.itinerary;

      console.log("VALIDATED ITINERARY:", {
        title: itinerary.title,
        totalDays: itinerary.totalDays,
        daysCount: itinerary.days.length,
      });

      // ==================================================
      // STEP 4: GET THE PREVIOUSLY GENERATED PROPOSAL
      // ==================================================

      // Do not regenerate stops here.
      // Use the exact proposal assessed by the feasibility
      // service and confirmed by the user.

      const proposedDays = state.proposedItineraryDays;

      console.log(
        "ITINERARY PROPOSAL READY FOR SAVING:",
        JSON.stringify(
          proposedDays.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            stops: day.stops.map((stop) => ({
              name: stop.name,
              startTime: stop.startTime,
              durationMinutes: stop.durationMinutes,
            })),
          })),
          null,
          2,
        ),
      );

      // ==================================================
      // STEP 5: SAVE THE PROPOSED ITINERARY
      // ==================================================

      console.log("SAVING PROPOSED ITINERARY");

      const updatedItinerary = await itineraryService.updateItinerary({
        tripId: state.tripId,
        threadId: state.threadId,
        title: itinerary.title,
        days: proposedDays,
      });

      if (!updatedItinerary) {
        throw new Error("The itinerary update operation did not return an updated itinerary.");
      }

      console.log("ITINERARY UPDATED SUCCESSFULLY:", {
        title: updatedItinerary.title,
        totalDays: updatedItinerary.totalDays,
        daysCount: updatedItinerary.days.length,
      });

      // ==================================================
      // STEP 6: PREPARE APPLIED CHANGES SUMMARY
      // ==================================================

      const appliedChanges: string[] = [];

      // --------------------------------------------------
      // REPORT REMOVALS
      // --------------------------------------------------

      for (const place of changes.removePlaces) {
        appliedChanges.push(
          `• Removed ${place.name}${
            place.dayNumber !== undefined ? ` from Day ${place.dayNumber}` : ""
          }`,
        );
      }

      // --------------------------------------------------
      // REPORT REPLACEMENTS
      // --------------------------------------------------

      for (const replacement of changes.replacePlaces) {
        appliedChanges.push(
          `• Replaced ${replacement.remove} with ${replacement.add}${
            replacement.dayNumber !== undefined ? ` on Day ${replacement.dayNumber}` : ""
          }${
            replacement.preferredTime
              ? `, with the requested visiting time "${replacement.preferredTime}"`
              : ""
          }`,
        );
      }

      // --------------------------------------------------
      // REPORT MOVES
      // --------------------------------------------------

      for (const move of changes.movePlaces) {
        const position = move.insertBefore
          ? ` before ${move.insertBefore}`
          : move.insertAfter
            ? ` after ${move.insertAfter}`
            : "";

        appliedChanges.push(
          `• Moved ${move.name} from Day ${move.fromDayNumber} to Day ${move.toDayNumber}${position}`,
        );
      }

      // --------------------------------------------------
      // REPORT ADDITIONS
      // --------------------------------------------------

      for (const place of changes.addPlaces) {
        const position = place.insertBefore
          ? ` immediately before ${place.insertBefore}`
          : place.insertAfter
            ? ` immediately after ${place.insertAfter}`
            : "";

        const finalDay = updatedItinerary.days.find((day) =>
          day.stops.some(
            (stop) => stop.name.trim().toLowerCase() === place.name.trim().toLowerCase(),
          ),
        )?.dayNumber;

        appliedChanges.push(
          `• Added ${place.name}${position}${finalDay !== undefined ? ` on Day ${finalDay}` : ""}${
            place.preferredTime ? `, with the requested visiting time "${place.preferredTime}"` : ""
          }`,
        );
      }

      // ==================================================
      // STEP 7: RETURN UPDATED STATE
      // ==================================================

      console.log("ITINERARY MODIFICATION COMPLETED");

      return {
        response: [
          "Your itinerary has been updated successfully!",
          "",
          "Applied changes:",
          ...(appliedChanges.length > 0
            ? appliedChanges
            : ["• Your requested itinerary changes were applied."]),
          "",
          "Your updated itinerary has been saved.",
        ].join("\n"),

        generatedItinerary: {
          title: updatedItinerary.title,
          days: updatedItinerary.days,
        },

        itineraryGeneratedNow: false,

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        // Clear temporary proposal after successful application.
        proposedItineraryDays: [],
        affectedDayNumbers: [],
      };
    } catch (error) {
      console.error("APPLY ITINERARY MODIFICATION ERROR:", error);

      return {
        response:
          error instanceof Error
            ? `Something went wrong while updating your itinerary: ${error.message}. Please check your saved itinerary before retrying.`
            : "Something went wrong while updating your itinerary. Please check your saved itinerary before retrying.",

        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,

        pendingItineraryChange: null,
        modificationFeasibility: null,

        proposedItineraryDays: [],
        affectedDayNumbers: [],
      };
    }
  };
};
