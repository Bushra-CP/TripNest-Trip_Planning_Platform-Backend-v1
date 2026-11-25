// Search for attraction operating hours using Google Places API
// Use Google Gemini AI as a fallback when Google Places has no opening hours.

import { injectable, inject } from "inversify";

import { env } from "@/config/env";
import { TYPES } from "@/di/types";

import { AttractionOperatingHoursSearchService } from "./attraction-operating-hours-search.service";

import type {
  AttractionOperatingHours,
  OperatingHoursRequest,
  OperatingPeriod,
  OperatingHoursStatus,
} from "@/interfaces/trip-planning/itinerary/attraction-operating-hours.interfaces";

interface GooglePlacesSearchResponse {
  places?: {
    id: string;
    displayName?: {
      text: string;
    };
    formattedAddress?: string;
  }[];
}

interface GooglePlaceDetailsResponse {
  id: string;

  displayName?: {
    text: string;
  };

  regularOpeningHours?: {
    weekdayDescriptions?: string[];

    periods?: {
      open?: {
        day: number;
        hour: number;
        minute: number;
      };

      close?: {
        day: number;
        hour: number;
        minute: number;
      };
    }[];
  };
}

@injectable()
export class AttractionOperatingHoursService {
  private readonly placesApiUrl = "https://places.googleapis.com/v1";

  private readonly weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  constructor(
    @inject(TYPES.AttractionOperatingHoursSearchService)
    private readonly attractionOperatingHoursSearchService: AttractionOperatingHoursSearchService,
  ) {}

  // ==================================================
  // GET OPERATING HOURS
  // ==================================================

  public async getOperatingHours(
    request: OperatingHoursRequest,
  ): Promise<AttractionOperatingHours> {
    if (!env.GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key is not configured");
    }

    // STEP 1: VALIDATE TRAVEL DATE

    const weekday =
      request.travelDate !== undefined ? this.getWeekday(request.travelDate) : undefined;

    // STEP 2: SEARCH ATTRACTION

    const place = await this.searchPlace(request.placeName);

    if (!place) {
      return this.createUnknownResult(
        request.placeName,
        "Attraction could not be found using Google Places.",
      );
    }

    // STEP 3: GET PLACE DETAILS

    const details = await this.getPlaceDetails(place.id);

    const regularOpeningHours = details.regularOpeningHours;

    const weekdayDescriptions = regularOpeningHours?.weekdayDescriptions ?? [];

    const googlePeriods = regularOpeningHours?.periods ?? [];

    // STEP 4: CHECK WHETHER GOOGLE PLACES PROVIDED OPENING HOURS

    if (weekdayDescriptions.length === 0 && googlePeriods.length === 0) {
      console.log("Google Places did not provide opening hours. Trying Gemini fallback...");

      return this.attractionOperatingHoursSearchService.searchOperatingHours(request.placeName);
    }

    // STEP 5: IDENTIFY WEEKLY CLOSING DAYS

    const closedDays = weekdayDescriptions
      .filter((description) => /:\s*closed\s*$/i.test(description))
      .map((description) => description.split(":")[0]?.trim() ?? "")
      .filter(Boolean);

    // STEP 6: GET OPERATING PERIODS

    const operatingPeriods = this.getOperatingPeriods(googlePeriods, weekdayDescriptions, weekday);

    // STEP 7: DETERMINE STATUS

    const status = this.determineStatus(
      weekdayDescriptions,
      operatingPeriods,
      weekday,
      googlePeriods.length > 0,
    );

    // STEP 8: DERIVE OPENING AND CLOSING TIMES

    const openingTime = operatingPeriods[0]?.openingTime;

    const closingTime =
      operatingPeriods.length > 0
        ? operatingPeriods[operatingPeriods.length - 1]?.closingTime
        : undefined;

    // STEP 9: CHECK INFORMATION AVAILABILITY

    const hasOpeningHours = weekdayDescriptions.length > 0 || googlePeriods.length > 0;

    const verified = status !== "UNKNOWN" && hasOpeningHours;

    let unavailableReason: string | undefined;

    if (!hasOpeningHours) {
      unavailableReason = "Google Places did not provide regular opening hours.";
    } else if (status === "UNKNOWN") {
      unavailableReason = "Operating hours for the requested day could not be determined.";
    }

    console.log("\n========== ATTRACTION OPERATING HOURS DEBUG ==========");

    console.log("REQUESTED PLACE:", request.placeName);
    console.log("TRAVEL DATE:", request.travelDate);
    console.log("TRAVEL WEEKDAY:", weekday !== undefined ? this.weekdays[weekday] : "Not provided");

    console.log("GOOGLE PLACE NAME:", details.displayName?.text);
    console.log("GOOGLE PLACE ID:", place.id);

    console.log("GOOGLE WEEKDAY DESCRIPTIONS:", weekdayDescriptions);
    console.log("GOOGLE RAW OPERATING PERIODS:", googlePeriods);
    console.log("FILTERED OPERATING PERIODS:", operatingPeriods);

    console.log("FINAL OPENING TIME:", openingTime ?? "Not available");
    console.log("FINAL CLOSING TIME:", closingTime ?? "Not available");

    console.log("CLOSED DAYS:", closedDays);
    console.log("OPERATING STATUS:", status);
    console.log("VERIFIED:", verified);
    console.log("UNAVAILABLE REASON:", unavailableReason ?? "None");

    console.log("======================================================\n");

    return {
      placeName: details.displayName?.text ?? request.placeName,

      ...(openingTime && { openingTime }),

      ...(closingTime && { closingTime }),

      closedDays,

      regularOpeningHours: weekdayDescriptions,

      operatingPeriods,

      source: "Google Places API",

      verified,

      status,

      ...(unavailableReason && { unavailableReason }),
    };
  }

  // ==================================================
  // CREATE UNKNOWN RESULT
  // ==================================================

  private createUnknownResult(placeName: string, reason: string): AttractionOperatingHours {
    return {
      placeName,
      closedDays: [],
      operatingPeriods: [],
      source: "Google Places API",
      verified: false,
      status: "UNKNOWN",
      unavailableReason: reason,
    };
  }

  // ==================================================
  // SEARCH PLACE
  // ==================================================

  private async searchPlace(placeName: string): Promise<{ id: string } | null> {
    const response = await fetch(`${this.placesApiUrl}/places:searchText`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },

      body: JSON.stringify({
        textQuery: placeName,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`Google Places search failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as GooglePlacesSearchResponse;

    return data.places?.[0] ? { id: data.places[0].id } : null;
  }

  // ==================================================
  // GET PLACE DETAILS
  // ==================================================

  private async getPlaceDetails(placeId: string): Promise<GooglePlaceDetailsResponse> {
    const response = await fetch(`${this.placesApiUrl}/places/${placeId}`, {
      method: "GET",

      headers: {
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,

        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "regularOpeningHours.weekdayDescriptions",
          "regularOpeningHours.periods",
        ].join(","),
      },
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`Google Places details request failed: ${response.status} ${error}`);
    }

    return (await response.json()) as GooglePlaceDetailsResponse;
  }

  // ==================================================
  // GET WEEKDAY FROM TRAVEL DATE
  // ==================================================

  private getWeekday(travelDate: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      throw new Error("Travel date must be in YYYY-MM-DD format.");
    }

    const date = new Date(`${travelDate}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== travelDate) {
      throw new Error("Invalid travel date.");
    }

    return date.getUTCDay();
  }

  // ==================================================
  // GET OPERATING PERIODS
  // ==================================================

  private getOperatingPeriods(
    googlePeriods: NonNullable<GooglePlaceDetailsResponse["regularOpeningHours"]>["periods"],
    weekdayDescriptions: string[],
    weekday?: number,
  ): OperatingPeriod[] {
    // TRAVEL DATE PROVIDED

    if (weekday !== undefined) {
      if (googlePeriods && googlePeriods.length > 0) {
        const structuredPeriods = this.getPeriodsFromStructuredData(weekday, googlePeriods);

        if (structuredPeriods.length > 0) {
          return structuredPeriods;
        }
      }

      return this.getPeriodsFromDescription(weekdayDescriptions, weekday);
    }

    // NO TRAVEL DATE: RETURN ALL WEEKLY PERIODS

    if (googlePeriods && googlePeriods.length > 0) {
      return this.getAllPeriodsFromStructuredData(googlePeriods);
    }

    return this.getAllPeriodsFromDescriptions(weekdayDescriptions);
  }

  // ==================================================
  // GET ALL WEEKLY PERIODS FROM STRUCTURED DATA
  // ==================================================

  private getAllPeriodsFromStructuredData(
    periods: NonNullable<GooglePlaceDetailsResponse["regularOpeningHours"]>["periods"] = [],
  ): OperatingPeriod[] {
    const result: OperatingPeriod[] = [];

    for (let day = 0; day < 7; day++) {
      result.push(...this.getPeriodsFromStructuredData(day, periods));
    }

    return result;
  }

  // ==================================================
  // GET ALL WEEKLY PERIODS FROM DESCRIPTIONS
  // ==================================================

  private getAllPeriodsFromDescriptions(weekdayDescriptions: string[]): OperatingPeriod[] {
    const result: OperatingPeriod[] = [];

    for (let day = 0; day < 7; day++) {
      result.push(...this.getPeriodsFromDescription(weekdayDescriptions, day));
    }

    return result;
  }

  // ==================================================
  // PARSE STRUCTURED GOOGLE PERIODS
  // ==================================================

  private getPeriodsFromStructuredData(
    weekday: number,
    periods: NonNullable<GooglePlaceDetailsResponse["regularOpeningHours"]>["periods"] = [],
  ): OperatingPeriod[] {
    const dayPeriods = periods
      .filter(
        (period) =>
          period.open?.day === weekday &&
          period.open.hour !== undefined &&
          period.open.minute !== undefined &&
          period.close?.hour !== undefined &&
          period.close.minute !== undefined,
      )
      .sort((a, b) => {
        const aMinutes = (a.open?.hour ?? 0) * 60 + (a.open?.minute ?? 0);

        const bMinutes = (b.open?.hour ?? 0) * 60 + (b.open?.minute ?? 0);

        return aMinutes - bMinutes;
      });

    const dayName = this.weekdays[weekday];

    if (!dayName) {
      return [];
    }

    return dayPeriods.flatMap((period) => {
      const open = period.open;
      const close = period.close;

      if (!open || !close) {
        return [];
      }

      return [
        {
          day: weekday,
          dayName,

          openingTime: this.formatTime(open.hour, open.minute),

          closingTime: this.formatTime(close.hour, close.minute),
        },
      ];
    });
  }

  // ==================================================
  // PARSE WEEKDAY DESCRIPTIONS
  // ==================================================

  private getPeriodsFromDescription(
    weekdayDescriptions: string[],
    weekday: number,
  ): OperatingPeriod[] {
    const weekdayName = this.weekdays[weekday];

    if (!weekdayName) {
      return [];
    }

    const description = weekdayDescriptions.find((item) => item.startsWith(`${weekdayName}:`));

    if (!description || /:\s*closed\s*$/i.test(description)) {
      return [];
    }

    const hoursText = description.substring(description.indexOf(":") + 1).trim();

    if (/open\s+24\s+hours/i.test(hoursText)) {
      return [];
    }

    const rangeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:–|-|to)\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;

    const operatingPeriods: OperatingPeriod[] = [];

    let match: RegExpExecArray | null;

    while ((match = rangeRegex.exec(hoursText)) !== null) {
      const openingTime = match[1];
      const closingTime = match[2];

      if (!openingTime || !closingTime) {
        continue;
      }

      operatingPeriods.push({
        day: weekday,
        dayName: weekdayName,

        openingTime: openingTime.trim().toUpperCase(),

        closingTime: closingTime.trim().toUpperCase(),
      });
    }

    return operatingPeriods;
  }

  // ==================================================
  // DETERMINE OPERATING STATUS
  // ==================================================

  private determineStatus(
    weekdayDescriptions: string[],
    operatingPeriods: OperatingPeriod[],
    weekday?: number,
    hasStructuredPeriods = false,
  ): OperatingHoursStatus {
    if (weekdayDescriptions.length === 0 && !hasStructuredPeriods) {
      return "UNKNOWN";
    }

    if (weekday !== undefined) {
      const weekdayName = this.weekdays[weekday];

      const description = weekdayDescriptions.find((item) => item.startsWith(`${weekdayName}:`));

      if (description && /:\s*closed\s*$/i.test(description)) {
        return "CLOSED";
      }

      if (description && /open\s+24\s+hours/i.test(description)) {
        return "OPEN_24_HOURS";
      }

      if (operatingPeriods.some((period) => period.day === weekday)) {
        return "AVAILABLE";
      }

      return "UNKNOWN";
    }

    if (operatingPeriods.length > 0) {
      return "AVAILABLE";
    }

    if (
      weekdayDescriptions.length === 7 &&
      weekdayDescriptions.every((description) => /:\s*closed\s*$/i.test(description))
    ) {
      return "CLOSED";
    }

    return "UNKNOWN";
  }

  // ==================================================
  // FORMAT TIME
  // ==================================================

  private formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? "PM" : "AM";

    const formattedHour = hour % 12 || 12;

    const formattedMinute = minute.toString().padStart(2, "0");

    return `${formattedHour}:${formattedMinute} ${period}`;
  }
}
