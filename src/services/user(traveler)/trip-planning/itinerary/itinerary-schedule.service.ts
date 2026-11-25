import { inject, injectable } from "inversify";

import type {
  IItineraryDay,
  IItineraryStop,
} from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";

import type {
  AttractionOperatingHours,
  OperatingPeriod,
} from "@/interfaces/trip-planning/itinerary/attraction-operating-hours.interfaces";

import { TYPES } from "@/di/types";

import { ItineraryTravelTimeService } from "./itinerary-travel-time.service";
import { AttractionOperatingHoursService } from "./attraction-operating-hours.service";

export interface DayScheduleAnalysis {
  dayNumber: number;
  totalStops: number;
  scheduledStops: number;
  totalActivityMinutes: number;
  firstActivityTime: string | null;
  lastActivityEndTime: string | null;
  elapsedMinutes: number | null;
  unscheduledMinutes: number | null;
  missingDurationStops: string[];
  missingStartTimeStops: string[];
  overlappingActivities: string[];
  scheduleGaps: {
    from: string;
    to: string;
    durationMinutes: number;
  }[];
}

export interface TravelLegAnalysis {
  from: string;
  to: string;
  distanceMeters: number | null;
  durationMinutes: number | null;
  status: "ESTIMATED" | "UNAVAILABLE";
}

export type OperatingHoursValidationStatus =
  "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN" | "NEEDS_DATE_CHECK";

export interface StopOperatingHoursAnalysis {
  stopName: string;
  status: OperatingHoursValidationStatus;
  operatingHoursStatus: AttractionOperatingHours["status"];
  openingTime: string | null;
  closingTime: string | null;
  lastEntryTime: string | null;
  activityStartTime: string | null;
  activityEndTime: string | null;
  issues: string[];
  operatingPeriods: OperatingPeriod[];
}

export interface DayScheduleWithTravelAnalysis extends DayScheduleAnalysis {
  travelLegs: TravelLegAnalysis[];
  totalEstimatedTravelMinutes: number;
  unavailableTravelLegs: number;
  operatingHoursAnalysis: StopOperatingHoursAnalysis[];
  incompatibleOperatingHours: number;
  unknownOperatingHours: number;
}

export interface ProposedItineraryScheduleAnalysis {
  affectedDays: DayScheduleWithTravelAnalysis[];
  totalEstimatedTravelMinutes: number;
  unavailableTravelLegs: number;
  hasScheduleOverlaps: boolean;
  daysWithMissingTiming: number[];
  hasOperatingHoursConflicts: boolean;
  daysWithOperatingHoursConflicts: number[];
  daysWithUnknownOperatingHours: number[];
}

@injectable()
export class ItineraryScheduleService {
  constructor(
    @inject(TYPES.ItineraryTravelTimeService)
    private readonly _itineraryTravelTimeService: ItineraryTravelTimeService,

    @inject(TYPES.AttractionOperatingHoursService)
    private readonly _attractionOperatingHoursService: AttractionOperatingHoursService,
  ) {}

  // --------------------------------------------------
  // BASIC DAY SCHEDULE ANALYSIS
  // --------------------------------------------------

  public analyzeDay(day: IItineraryDay): DayScheduleAnalysis {
    const missingDurationStops = day.stops
      .filter((stop) => stop.durationMinutes === undefined)
      .map((stop) => stop.name);

    const missingStartTimeStops = day.stops
      .filter((stop) => !stop.startTime)
      .map((stop) => stop.name);

    let totalActivityMinutes = 0;

    for (const stop of day.stops) {
      if (stop.durationMinutes !== undefined) {
        totalActivityMinutes += stop.durationMinutes;
      }
    }

    const scheduledStops = day.stops
      .map((stop) => ({
        stop,
        startMinutes: stop.startTime ? this.toMinutes(stop.startTime) : null,
      }))
      .filter(
        (
          item,
        ): item is {
          stop: IItineraryStop;
          startMinutes: number;
        } => item.startMinutes !== null && item.stop.durationMinutes !== undefined,
      )
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const overlappingActivities: string[] = [];
    const scheduleGaps: DayScheduleAnalysis["scheduleGaps"] = [];

    for (let i = 0; i < scheduledStops.length - 1; i++) {
      const current = scheduledStops[i];
      const next = scheduledStops[i + 1];

      if (!current || !next) {
        continue;
      }

      const currentEnd = current.startMinutes + current.stop.durationMinutes!;

      if (currentEnd > next.startMinutes) {
        overlappingActivities.push(
          `${current.stop.name} overlaps with ${next.stop.name} by ${
            currentEnd - next.startMinutes
          } minutes.`,
        );
      } else if (currentEnd < next.startMinutes) {
        scheduleGaps.push({
          from: this.toTime(currentEnd),
          to: this.toTime(next.startMinutes),
          durationMinutes: next.startMinutes - currentEnd,
        });
      }
    }

    const firstActivity = scheduledStops[0];
    const lastActivity = scheduledStops.at(-1);

    const lastActivityEndMinutes = lastActivity
      ? lastActivity.startMinutes + lastActivity.stop.durationMinutes!
      : null;

    const elapsedMinutes =
      firstActivity && lastActivityEndMinutes !== null
        ? lastActivityEndMinutes - firstActivity.startMinutes
        : null;

    const unscheduledMinutes =
      elapsedMinutes !== null
        ? scheduleGaps.reduce((total, gap) => total + gap.durationMinutes, 0)
        : null;

    return {
      dayNumber: day.dayNumber,
      totalStops: day.stops.length,
      scheduledStops: scheduledStops.length,
      totalActivityMinutes,
      firstActivityTime: firstActivity?.stop.startTime ?? null,
      lastActivityEndTime:
        lastActivityEndMinutes !== null ? this.toTime(lastActivityEndMinutes) : null,
      elapsedMinutes,
      unscheduledMinutes,
      missingDurationStops,
      missingStartTimeStops,
      overlappingActivities,
      scheduleGaps,
    };
  }

  // --------------------------------------------------
  // ANALYZE ALL DAYS
  // --------------------------------------------------

  public analyzeItinerary(days: IItineraryDay[]): DayScheduleAnalysis[] {
    return days.map((day) => this.analyzeDay(day));
  }

  // --------------------------------------------------
  // DAY ANALYSIS WITH TRAVEL AND OPERATING HOURS
  // --------------------------------------------------

  public async analyzeDayWithTravel(
    day: IItineraryDay,
    travelMode: string,
    travelDate?: string | undefined,
  ): Promise<DayScheduleWithTravelAnalysis> {
    const scheduleAnalysis = this.analyzeDay(day);

    const travelLegs: TravelLegAnalysis[] = [];

    let totalEstimatedTravelMinutes = 0;
    let unavailableTravelLegs = 0;

    // Calculate travel time between consecutive stops.

    for (let i = 0; i < day.stops.length - 1; i++) {
      const currentStop = day.stops[i];
      const nextStop = day.stops[i + 1];

      if (!currentStop || !nextStop) {
        continue;
      }

      const origin = currentStop.location
        ? `${currentStop.name}, ${currentStop.location}`
        : currentStop.name;

      const destination = nextStop.location
        ? `${nextStop.name}, ${nextStop.location}`
        : nextStop.name;

      try {
        const travelResult = await this._itineraryTravelTimeService.getTravelTime(
          origin,
          destination,
          travelMode,
        );

        travelLegs.push({
          from: currentStop.name,
          to: nextStop.name,
          distanceMeters: travelResult.distanceMeters,
          durationMinutes: travelResult.durationMinutes,
          status: "ESTIMATED",
        });

        totalEstimatedTravelMinutes += travelResult.durationMinutes;
      } catch (error) {
        console.error(
          `[Itinerary Schedule] Travel estimation failed: ${origin} -> ${destination}`,
          error,
        );

        travelLegs.push({
          from: currentStop.name,
          to: nextStop.name,
          distanceMeters: null,
          durationMinutes: null,
          status: "UNAVAILABLE",
        });

        unavailableTravelLegs++;
      }
    }

    // Check operating hours for every stop.

    const operatingHoursAnalysis = await Promise.all(
      day.stops.map((stop) => this.analyzeStopOperatingHours(stop, travelDate)),
    );

    const incompatibleOperatingHours = operatingHoursAnalysis.filter(
      (analysis) => analysis.status === "INCOMPATIBLE",
    ).length;

    const unknownOperatingHours = operatingHoursAnalysis.filter(
      (analysis) => analysis.status === "UNKNOWN" || analysis.status === "NEEDS_DATE_CHECK",
    ).length;

    return {
      ...scheduleAnalysis,
      travelLegs,
      totalEstimatedTravelMinutes,
      unavailableTravelLegs,
      operatingHoursAnalysis,
      incompatibleOperatingHours,
      unknownOperatingHours,
    };
  }

  // --------------------------------------------------
  // OPERATING HOURS VALIDATION FOR A STOP
  // --------------------------------------------------

  private async analyzeStopOperatingHours(
    stop: IItineraryStop,
    travelDate?: string | undefined,
  ): Promise<StopOperatingHoursAnalysis> {
    const activityStartTime = stop.startTime ?? null;

    const startMinutes = stop.startTime ? this.toMinutes(stop.startTime) : null;

    const activityEndMinutes =
      startMinutes !== null && stop.durationMinutes !== undefined
        ? startMinutes + stop.durationMinutes
        : null;

    const activityEndTime = activityEndMinutes !== null ? this.toTime(activityEndMinutes) : null;

    try {
      const placeName = stop.location ? `${stop.name}, ${stop.location}` : stop.name;

      const operatingHours = await this._attractionOperatingHoursService.getOperatingHours({
        placeName,
        travelDate,
      });

      return this.validateOperatingHours(
        stop,
        operatingHours,
        activityStartTime,
        activityEndTime,
        startMinutes,
        activityEndMinutes,
        Boolean(travelDate),
      );
    } catch (error) {
      console.error(`[Itinerary Schedule] Operating hours lookup failed for ${stop.name}`, error);

      return {
        stopName: stop.name,
        status: "UNKNOWN",
        operatingHoursStatus: "UNKNOWN",
        openingTime: null,
        closingTime: null,
        lastEntryTime: null,
        activityStartTime,
        activityEndTime,
        issues: ["Unable to retrieve operating hours for this attraction."],
        operatingPeriods: [],
      };
    }
  }

  // --------------------------------------------------
  // VALIDATE ACTIVITY AGAINST OPERATING HOURS
  // --------------------------------------------------

  private validateOperatingHours(
    stop: IItineraryStop,
    operatingHours: AttractionOperatingHours,
    activityStartTime: string | null,
    activityEndTime: string | null,
    startMinutes: number | null,
    activityEndMinutes: number | null,
    hasTravelDate: boolean,
  ): StopOperatingHoursAnalysis {
    const issues: string[] = [];

    const periods = operatingHours.operatingPeriods ?? [];

    const baseResult = {
      stopName: stop.name,
      operatingHoursStatus: operatingHours.status,
      openingTime: this.formatDisplayTime(operatingHours.openingTime),
      closingTime: this.formatDisplayTime(operatingHours.closingTime),
      lastEntryTime: this.formatDisplayTime(operatingHours.lastEntryTime),
      activityStartTime,
      activityEndTime,
      operatingPeriods: periods,
    };

    // No reliable opening-hour information.

    if (operatingHours.status === "UNKNOWN") {
      issues.push("Operating hours could not be verified. Manual verification is required.");

      return {
        ...baseResult,
        status: "UNKNOWN",
        issues,
      };
    }

    // Attraction is closed on the requested date.

    if (operatingHours.status === "CLOSED") {
      issues.push(
        hasTravelDate
          ? "This attraction is closed on the planned travel date."
          : "This attraction is reported as closed.",
      );

      return {
        ...baseResult,
        status: "INCOMPATIBLE",
        issues,
      };
    }

    // Attraction operates 24 hours.

    if (operatingHours.status === "OPEN_24_HOURS") {
      return {
        ...baseResult,
        status: "COMPATIBLE",
        issues,
      };
    }

    // Cannot validate activity without timing information.

    if (
      startMinutes === null ||
      activityEndMinutes === null ||
      stop.durationMinutes === undefined
    ) {
      issues.push(
        "Activity start time or duration is missing. Operating-hour compatibility cannot be checked.",
      );

      return {
        ...baseResult,
        status: "UNKNOWN",
        issues,
      };
    }

    if (periods.length === 0) {
      issues.push("No usable operating periods are available for this attraction.");

      return {
        ...baseResult,
        status: "UNKNOWN",
        issues,
      };
    }

    // Determine whether the activity fits within an operating period.

    const matchingPeriod = periods.find((period) =>
      this.activityFitsPeriod(startMinutes, stop.durationMinutes!, period),
    );

    if (matchingPeriod) {
      // Check last entry separately from closing time.

      if (operatingHours.lastEntryTime) {
        const lastEntryMinutes = this.toMinutes(operatingHours.lastEntryTime);

        if (lastEntryMinutes !== null && startMinutes > lastEntryMinutes) {
          issues.push(
            `The planned activity starts after the last entry time (${this.formatDisplayTime(operatingHours.lastEntryTime)}).`,
          );

          return {
            ...baseResult,
            status: "INCOMPATIBLE",
            issues,
          };
        }
      }

      // If no travel date is supplied, weekly hours cannot
      // confirm the correct weekday.

      if (!hasTravelDate) {
        issues.push(
          "The activity fits within at least one weekly operating period, but the travel date is needed to confirm the correct weekday.",
        );

        return {
          ...baseResult,
          status: "NEEDS_DATE_CHECK",
          issues,
        };
      }

      return {
        ...baseResult,
        status: "COMPATIBLE",
        issues,
      };
    }

    // No matching operating period.

    if (!hasTravelDate) {
      issues.push("The planned activity does not fit within any supplied weekly operating period.");
    } else {
      issues.push(
        "The planned activity does not fit within the operating periods for the planned travel date.",
      );
    }

    return {
      ...baseResult,
      status: "INCOMPATIBLE",
      issues,
    };
  }

  // --------------------------------------------------
  // CHECK ACTIVITY AGAINST AN OPERATING PERIOD
  // --------------------------------------------------

  private activityFitsPeriod(
    activityStart: number,
    durationMinutes: number,
    period: OperatingPeriod,
  ): boolean {
    const opening = this.toMinutes(period.openingTime);
    const closing = this.toMinutes(period.closingTime);

    if (opening === null || closing === null) {
      return false;
    }

    // A closing time earlier than or equal to opening time
    // represents an overnight period.

    const adjustedClosing = closing <= opening ? closing + 24 * 60 : closing;

    // Support activities that begin after midnight during
    // an overnight operating period.

    const possibleStartTimes = [activityStart, activityStart + 24 * 60];

    return possibleStartTimes.some((start) => {
      const end = start + durationMinutes;

      return start >= opening && end <= adjustedClosing;
    });
  }

  // --------------------------------------------------
  // ANALYZE AFFECTED DAYS
  // --------------------------------------------------

  public async analyzeAffectedDaysWithTravel(
    days: IItineraryDay[],
    affectedDayNumbers: number[],
    travelMode: string,
    itineraryStartDate?: string | undefined,
  ): Promise<DayScheduleWithTravelAnalysis[]> {
    const affectedDays = days.filter((day) => affectedDayNumbers.includes(day.dayNumber));

    return Promise.all(
      affectedDays.map((day) => {
        const travelDate = itineraryStartDate
          ? this.getDayTravelDate(itineraryStartDate, day.dayNumber)
          : undefined;

        return this.analyzeDayWithTravel(day, travelMode, travelDate);
      }),
    );
  }

  // --------------------------------------------------
  // ANALYZE PROPOSED ITINERARY
  // --------------------------------------------------

  public async analyzeProposedItinerary(
    proposedDays: IItineraryDay[],
    affectedDayNumbers: number[],
    travelMode: string,
    itineraryStartDate?: string | undefined,
  ): Promise<ProposedItineraryScheduleAnalysis> {
    const affectedDays = await this.analyzeAffectedDaysWithTravel(
      proposedDays,
      affectedDayNumbers,
      travelMode,
      itineraryStartDate,
    );

    const daysWithOperatingHoursConflicts = affectedDays
      .filter((day) => day.incompatibleOperatingHours > 0)
      .map((day) => day.dayNumber);

    const daysWithUnknownOperatingHours = affectedDays
      .filter((day) => day.unknownOperatingHours > 0)
      .map((day) => day.dayNumber);

    return {
      affectedDays,

      totalEstimatedTravelMinutes: affectedDays.reduce(
        (total, day) => total + day.totalEstimatedTravelMinutes,
        0,
      ),

      unavailableTravelLegs: affectedDays.reduce(
        (total, day) => total + day.unavailableTravelLegs,
        0,
      ),

      hasScheduleOverlaps: affectedDays.some((day) => day.overlappingActivities.length > 0),

      daysWithMissingTiming: affectedDays
        .filter(
          (day) => day.missingDurationStops.length > 0 || day.missingStartTimeStops.length > 0,
        )
        .map((day) => day.dayNumber),

      hasOperatingHoursConflicts: daysWithOperatingHoursConflicts.length > 0,

      daysWithOperatingHoursConflicts,

      daysWithUnknownOperatingHours,
    };
  }

  // --------------------------------------------------
  // GET DATE FOR AN ITINERARY DAY
  // --------------------------------------------------

  private getDayTravelDate(itineraryStartDate: string, dayNumber: number): string {
    const dateMatch = itineraryStartDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!dateMatch) {
      throw new Error(`Invalid itinerary start date: ${itineraryStartDate}. Expected YYYY-MM-DD.`);
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    // Reject invalid calendar dates such as 2026-02-31.

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Invalid calendar date: ${itineraryStartDate}.`);
    }

    date.setUTCDate(date.getUTCDate() + dayNumber - 1);

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  // --------------------------------------------------
  // TIME UTILITIES
  // --------------------------------------------------

  private toMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();

    if (hours > 23 || minutes > 59) {
      return null;
    }

    if (period) {
      if (hours < 1 || hours > 12) {
        return null;
      }

      if (period === "AM" && hours === 12) {
        hours = 0;
      } else if (period === "PM" && hours !== 12) {
        hours += 12;
      }
    }

    return hours * 60 + minutes;
  }

  private toTime(totalMinutes: number): string {
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  private formatDisplayTime(time: string | null | undefined): string | null {
    if (!time) {
      return null;
    }

    const minutes = this.toMinutes(time);

    if (minutes === null) {
      return time;
    }

    return this.toTime(minutes);
  }
}
