import { inject, injectable } from "inversify";

import type {
  IItinerary,
  IItineraryDay,
  IItineraryStop,
} from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";

import type { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";

import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";
import { ItineraryScheduleService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-schedule.service";

import { TYPES } from "@/di/types";
import { AttractionOperatingHoursService } from "./attraction-operating-hours.service";

export interface ItineraryModificationPreview {
  proposedDays: IItineraryDay[];
  affectedDayNumbers: number[];
  schedulingIssues: string[];
}

@injectable()
export class ItineraryModificationBuilderService {
  constructor(
    @inject(TYPES.ItineraryGenerationService)
    private readonly _itineraryGenerationService: ItineraryGenerationService,

    @inject(TYPES.ItineraryScheduleService)
    private readonly _itineraryScheduleService: ItineraryScheduleService,

    @inject(TYPES.AttractionOperatingHoursService)
    private readonly _attractionOperatingHoursService: AttractionOperatingHoursService,
  ) {}

  public async buildProposedItinerary(
    itinerary: IItinerary,
    changes: PendingItineraryChange,
  ): Promise<ItineraryModificationPreview> {
    // ==================================================
    // HELPERS
    // ==================================================

    const normalize = (name?: string | null): string =>
      (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

    // Calculate the actual calendar date for an itinerary day.
    const getDayTravelDate = (startDate: string, dayNumber: number): string => {
      const dateMatch = startDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (!dateMatch) {
        throw new Error(`Invalid itinerary start date: ${startDate}. Expected YYYY-MM-DD.`);
      }

      const year = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const day = Number(dateMatch[3]);

      const date = new Date(Date.UTC(year, month - 1, day));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new Error(`Invalid itinerary calendar date: ${startDate}.`);
      }

      date.setUTCDate(date.getUTCDate() + dayNumber - 1);

      return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
      ].join("-");
    };

    // ==================================================
    // STEP 1: CREATE INDEPENDENT ITINERARY COPY
    // ==================================================

    const proposedDays: IItineraryDay[] = itinerary.days.map((day, index) => {
      const dayData = typeof (day as any).toObject === "function" ? (day as any).toObject() : day;

      return {
        ...dayData,
        dayNumber: dayData.dayNumber ?? index + 1,

        stops: (dayData.stops ?? []).map((stop: any) => {
          const stopData = typeof stop.toObject === "function" ? stop.toObject() : stop;

          return { ...stopData };
        }),
      };
    });

    const affectedDayNumbers = new Set<number>();

    const schedulingIssues: string[] = [];

    // ==================================================
    // STEP 2: HELPER FUNCTIONS
    // ==================================================

    const findStopLocations = (name: string, dayNumber?: number) =>
      proposedDays.flatMap((day) =>
        day.stops.flatMap((stop, index) =>
          normalize(stop.name) === normalize(name) &&
          (dayNumber === undefined || day.dayNumber === dayNumber)
            ? [{ day, index, stop }]
            : [],
        ),
      );

    const findUniqueStop = (name: string, dayNumber?: number) => {
      const matches = findStopLocations(name, dayNumber);

      if (matches.length === 0) {
        throw new Error(`"${name}" could not be found in the proposed itinerary.`);
      }

      if (matches.length > 1) {
        throw new Error(`"${name}" appears more than once. Please specify the correct day.`);
      }

      return matches[0]!;
    };

    const findDay = (dayNumber: number): IItineraryDay => {
      const day = proposedDays.find((item) => item.dayNumber === dayNumber);

      if (!day) {
        throw new Error(`Day ${dayNumber} does not exist.`);
      }

      return day;
    };

    // ==================================================
    // STEP 3: GENERATE NEW ATTRACTION DETAILS
    // ==================================================

    const generateStop = async (
      placeName: string,
      dayNumber: number,
      insertionIndex: number,
      preferredTime?: string,
    ): Promise<IItineraryStop> => {
      const targetDay = findDay(dayNumber);
      const existingStops = targetDay.stops;
      const precedingStops = existingStops.slice(0, insertionIndex);

      // Get the actual calendar date, if available.
      const travelDate = itinerary.startDate
        ? getDayTravelDate(itinerary.startDate, dayNumber)
        : undefined;

      // ----------------------------------------------
      // 1. Calculate the expected arrival time
      // ----------------------------------------------

      // This temporary stop is used only to calculate its start time.
      // Its one-minute duration is never sent to Gemini or saved.
      const temporaryStop = {
        name: placeName,
        description: "Temporary stop used to calculate arrival time.",
        startTime: "09:00 AM",
        durationMinutes: 1,
      } as IItineraryStop;

      const temporaryDay: IItineraryDay = {
        ...targetDay,
        stops: [...precedingStops, temporaryStop],
      };

      let expectedArrivalTime: string | undefined;

      try {
        const arrivalAnalysis = await this._itineraryScheduleService.analyzeDayWithTravel(
          temporaryDay,
          itinerary.travelMode,
          travelDate,
        );

        const allRequiredTravelLegsAvailable =
          arrivalAnalysis.travelLegs.length === precedingStops.length &&
          arrivalAnalysis.travelLegs.every((leg) => leg.status === "ESTIMATED");

        const allPrecedingDurationsAvailable = precedingStops.every(
          (stop) => typeof stop.durationMinutes === "number" && stop.durationMinutes > 0,
        );

        // Do not use a guessed arrival time if a required travel time
        // or a preceding attraction duration is unavailable.
        if (allRequiredTravelLegsAvailable && allPrecedingDurationsAvailable) {
          const arrivalOperatingHours = arrivalAnalysis.operatingHoursAnalysis.map((analysis) => ({
            stopName: analysis.stopName,
            status: analysis.status,
            operatingHoursStatus: analysis.operatingHoursStatus,
            openingTime: analysis.openingTime,
            closingTime: analysis.closingTime,
            lastEntryTime: analysis.lastEntryTime,
            operatingPeriods: analysis.operatingPeriods,
            issues: analysis.issues,
          }));

          const arrivalSchedule = this._itineraryGenerationService.calculateDaySchedule({
            day: temporaryDay,
            travelMode: itinerary.travelMode,
            tripType: itinerary.tripType,
            preferences: itinerary.preferences,
            travelLegs: arrivalAnalysis.travelLegs.map((leg) => ({
              from: leg.from,
              to: leg.to,
              durationMinutes: leg.status === "ESTIMATED" ? leg.durationMinutes : null,
              status: leg.status,
            })),
            operatingHours: arrivalOperatingHours,
          });

          // The final stop in the temporary day is the new attraction.
          expectedArrivalTime = arrivalSchedule.day.stops.at(-1)?.startTime;
        }
      } catch (error) {
        console.error(
          `[Itinerary Modification] Could not calculate arrival time for ${placeName}:`,
          error,
        );
      }

      console.log("\n========== EXPECTED ARRIVAL TIME ==========");
      console.log("Attraction:", placeName);
      console.log("Day:", dayNumber);
      console.log("Insertion index:", insertionIndex);
      console.log("Expected arrival:", expectedArrivalTime ?? "Unavailable");
      console.log("===========================================\n");

      // ----------------------------------------------
      // 2. Retrieve the new attraction's operating hours
      // ----------------------------------------------

      let operatingHours;

      try {
        operatingHours = await this._attractionOperatingHoursService.getOperatingHours({
          placeName,
          travelDate,
        });

        console.log(`\n========== OPERATING HOURS FOR ${placeName} ==========`);
        console.log(JSON.stringify(operatingHours, null, 2));
      } catch (error) {
        console.error(
          `[Itinerary Modification] Operating-hours lookup failed for ${placeName}:`,
          error,
        );

        operatingHours = {
          status: "UNKNOWN",
          unavailableReason: "Unable to retrieve operating hours.",
        };
      }

      // ----------------------------------------------
      // 3. Generate attraction details using Gemini
      // ----------------------------------------------

      return this._itineraryGenerationService.generateStopDetails(
        placeName,
        itinerary.destinations.join(", "),
        dayNumber,
        itinerary.travelMode,
        itinerary.tripType,
        itinerary.preferences,

        // Send all existing stops as context for Gemini.
        existingStops.map((stop) => ({
          name: stop.name,
          ...(stop.startTime !== undefined && {
            startTime: stop.startTime,
          }),
          ...(stop.durationMinutes !== undefined && {
            durationMinutes: stop.durationMinutes,
          }),
        })),

        preferredTime,

        {
          status: operatingHours.status,
          ...(operatingHours.openingTime && {
            openingTime: operatingHours.openingTime,
          }),
          ...(operatingHours.closingTime && {
            closingTime: operatingHours.closingTime,
          }),
          ...(operatingHours.regularOpeningHours && {
            regularOpeningHours: operatingHours.regularOpeningHours,
          }),
          ...(operatingHours.unavailableReason && {
            unavailableReason: operatingHours.unavailableReason,
          }),
        },

        expectedArrivalTime,
      );
    };

    // ==================================================
    // STEP 4: CHECK INSERTION ANCHOR CONFLICTS
    // ==================================================

    const affectedNames = new Set<string>();

    for (const place of changes.removePlaces) {
      affectedNames.add(normalize(place.name));
    }

    for (const replacement of changes.replacePlaces) {
      affectedNames.add(normalize(replacement.remove));
    }

    for (const move of changes.movePlaces) {
      affectedNames.add(normalize(move.name));
    }

    for (const place of changes.addPlaces) {
      const anchors = [place.insertBefore, place.insertAfter].filter((anchor): anchor is string =>
        Boolean(anchor?.trim()),
      );

      for (const anchor of anchors) {
        if (affectedNames.has(normalize(anchor))) {
          throw new Error(
            `The insertion anchor "${anchor}" is also being removed, replaced or moved in this request.`,
          );
        }
      }
    }

    // ==================================================
    // STEP 5: APPLY REPLACEMENTS
    // ==================================================

    for (const replacement of changes.replacePlaces) {
      if (!replacement.add?.trim()) {
        throw new Error("A valid replacement attraction name is required.");
      }

      const { day, index } = findUniqueStop(replacement.remove, replacement.dayNumber);

      const duplicateExists = proposedDays.some((candidateDay) =>
        candidateDay.stops.some((stop) => normalize(stop.name) === normalize(replacement.add)),
      );

      if (duplicateExists) {
        throw new Error(`"${replacement.add}" is already included in the itinerary.`);
      }

      const replacementStop = await generateStop(
        replacement.add.trim(),
        day.dayNumber,
        index,
        replacement.preferredTime,
      );

      day.stops[index] = replacementStop;

      affectedDayNumbers.add(day.dayNumber);
    }

    // ==================================================
    // STEP 6: APPLY REMOVALS
    // ==================================================

    for (const place of changes.removePlaces) {
      const { day, index } = findUniqueStop(place.name, place.dayNumber);

      day.stops.splice(index, 1);

      affectedDayNumbers.add(day.dayNumber);
    }

    // ==================================================
    // STEP 7: APPLY MOVES
    // ==================================================

    for (const move of changes.movePlaces) {
      const source = findUniqueStop(move.name, move.fromDayNumber);

      const destinationDay = findDay(move.toDayNumber);

      const hasInsertBefore = Boolean(move.insertBefore?.trim());
      const hasInsertAfter = Boolean(move.insertAfter?.trim());

      if (hasInsertBefore && hasInsertAfter) {
        throw new Error(`The requested position for "${move.name}" is ambiguous.`);
      }

      if (move.fromDayNumber === move.toDayNumber) {
        throw new Error(`"${move.name}" is already on Day ${move.fromDayNumber}.`);
      }

      const [movedStop] = source.day.stops.splice(source.index, 1);

      if (!movedStop) {
        throw new Error(`Unable to retrieve "${move.name}" from Day ${move.fromDayNumber}.`);
      }

      let insertionIndex: number;

      if (hasInsertBefore && move.insertBefore) {
        const anchor = findUniqueStop(move.insertBefore, move.toDayNumber);

        insertionIndex = anchor.index;
      } else if (hasInsertAfter && move.insertAfter) {
        const anchor = findUniqueStop(move.insertAfter, move.toDayNumber);

        insertionIndex = anchor.index + 1;
      } else {
        insertionIndex = destinationDay.stops.length;
      }

      destinationDay.stops.splice(insertionIndex, 0, movedStop);

      affectedDayNumbers.add(move.fromDayNumber);
      affectedDayNumbers.add(move.toDayNumber);
    }

    // ==================================================
    // STEP 8: APPLY ADDITIONS
    // ==================================================

    for (const place of changes.addPlaces) {
      if (!place.name?.trim()) {
        throw new Error("A valid place name is required to add an attraction.");
      }

      const alreadyExists = proposedDays.some((day) =>
        day.stops.some((stop) => normalize(stop.name) === normalize(place.name)),
      );

      if (alreadyExists) {
        throw new Error(`"${place.name}" is already included in the itinerary.`);
      }

      const hasInsertBefore = Boolean(place.insertBefore?.trim());
      const hasInsertAfter = Boolean(place.insertAfter?.trim());

      if (hasInsertBefore && hasInsertAfter) {
        throw new Error(`The requested position for "${place.name}" is ambiguous.`);
      }

      let targetDay: IItineraryDay | undefined;
      let insertionIndex: number | undefined;

      if (hasInsertBefore && place.insertBefore) {
        const anchor = findUniqueStop(place.insertBefore);

        targetDay = anchor.day;
        insertionIndex = anchor.index;
      } else if (hasInsertAfter && place.insertAfter) {
        const anchor = findUniqueStop(place.insertAfter);

        targetDay = anchor.day;
        insertionIndex = anchor.index + 1;
      } else {
        targetDay =
          place.dayNumber === undefined
            ? proposedDays.at(-1)
            : proposedDays.find((day) => day.dayNumber === place.dayNumber);

        if (!targetDay) {
          throw new Error(`Unable to identify a valid day for "${place.name}".`);
        }

        insertionIndex = targetDay.stops.length;
      }

      if (!targetDay || insertionIndex === undefined) {
        throw new Error(`Unable to determine where to insert "${place.name}".`);
      }

      if (place.dayNumber !== undefined && place.dayNumber !== targetDay.dayNumber) {
        throw new Error(
          `"${place.name}" was requested for Day ${place.dayNumber}, but its insertion anchor is on Day ${targetDay.dayNumber}.`,
        );
      }

      const newStop = await generateStop(
        place.name.trim(),
        targetDay.dayNumber,
        insertionIndex,
        place.preferredTime,
      );

      targetDay.stops.splice(insertionIndex, 0, newStop);

      affectedDayNumbers.add(targetDay.dayNumber);
    }

    // ==================================================
    // STEP 9: RESCHEDULE AFFECTED DAYS
    // ==================================================

    for (const day of proposedDays) {
      if (!affectedDayNumbers.has(day.dayNumber)) {
        continue;
      }

      if (day.stops.length === 0) {
        continue;
      }

      // Get the actual calendar date for this itinerary day.

      const formattedTravelDate = itinerary.startDate
        ? getDayTravelDate(itinerary.startDate, day.dayNumber)
        : undefined;

      // ----------------------------------------------
      // 9.1: ANALYZE TRAVEL AND OPERATING HOURS
      // ----------------------------------------------

      const scheduleAnalysis = await this._itineraryScheduleService.analyzeDayWithTravel(
        day,
        itinerary.travelMode,
        formattedTravelDate,
      );

      // ----------------------------------------------
      // 9.2: PREPARE OPERATING-HOURS INFORMATION
      // ----------------------------------------------

      const operatingHours = scheduleAnalysis.operatingHoursAnalysis.map((analysis) => ({
        stopName: analysis.stopName,
        status: analysis.status,
        operatingHoursStatus: analysis.operatingHoursStatus,
        openingTime: analysis.openingTime,
        closingTime: analysis.closingTime,
        lastEntryTime: analysis.lastEntryTime,
        operatingPeriods: analysis.operatingPeriods,
        issues: analysis.issues,
      }));

      console.log(`\n========== OPERATING HOURS: DAY ${day.dayNumber} ==========`);

      console.log(JSON.stringify(operatingHours, null, 2));

      // ----------------------------------------------
      // 9.3: PREPARE SCHEDULING INPUT
      // ----------------------------------------------

      const rescheduleInput = {
        day,
        travelMode: itinerary.travelMode,
        tripType: itinerary.tripType,
        preferences: itinerary.preferences,

        travelLegs: scheduleAnalysis.travelLegs.map((leg) => ({
          from: leg.from,
          to: leg.to,
          durationMinutes: leg.status === "ESTIMATED" ? leg.durationMinutes : null,
          status: leg.status,
        })),

        operatingHours,
      };

      // ----------------------------------------------
      // 9.4: CALCULATE SCHEDULE USING TYPESCRIPT
      // ----------------------------------------------

      const calculatedSchedule =
        this._itineraryGenerationService.calculateDaySchedule(rescheduleInput);

      console.log(`\n========== DETERMINISTIC SCHEDULE: DAY ${day.dayNumber} ==========`);

      console.log("Calculated stops:", JSON.stringify(calculatedSchedule.day.stops, null, 2));

      console.log("Scheduling issues:", JSON.stringify(calculatedSchedule.issues, null, 2));

      // ----------------------------------------------
      // 9.5: CHECK SCHEDULING FEASIBILITY
      // ----------------------------------------------

      if (calculatedSchedule.issues.length > 0) {
        schedulingIssues.push(
          ...calculatedSchedule.issues.map((issue) => `Day ${day.dayNumber}: ${issue}`),
        );
      }

      // ----------------------------------------------
      // 9.6: USE THE CALCULATED SCHEDULE
      // ----------------------------------------------

      day.stops = calculatedSchedule.day.stops;

      console.log(`Day ${day.dayNumber} schedule calculated successfully.`);
    }

    // ==================================================
    // STEP 10: RETURN PROPOSED ITINERARY
    // ==================================================

    return {
      proposedDays,
      affectedDayNumbers: [...affectedDayNumbers].sort((a, b) => a - b),
      schedulingIssues,
    };
  }
}
