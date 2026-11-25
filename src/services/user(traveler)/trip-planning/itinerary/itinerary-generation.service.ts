import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";
import { z } from "zod";
import { env } from "@/config/env";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import type {
  IItinerary,
  IItineraryDay,
  IItineraryTemplate,
} from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { AppError } from "@/shared/errors/app.error";

// Validate each stop in the generated itinerary.
const itineraryStopSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    activityType: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().optional(),
    durationMinutes: z.number().positive().optional(),
  })
  .transform((stop) => ({
    name: stop.name,
    description: stop.description,
    ...(stop.activityType !== undefined && { activityType: stop.activityType }),
    ...(stop.location !== undefined && { location: stop.location }),
    ...(stop.startTime !== undefined && { startTime: stop.startTime }),
    ...(stop.durationMinutes !== undefined && {
      durationMinutes: stop.durationMinutes,
    }),
  }));

// Validate each day.
const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  stops: z.array(itineraryStopSchema),
});

// Validate the complete generated itinerary.
const generatedItinerarySchema = z.object({
  title: z.string(),
  days: z.array(itineraryDaySchema),
});

export type GeneratedItinerary = {
  title: string;
  days: IItineraryDay[];
};

export interface ItineraryValidationResult {
  isValid: boolean;
  violations: string[];
}

/**
 * Normalize text for requirement comparison.
 *
 * This function is generic and does not contain destination-specific
 * or activity-specific rules.
 *
 * Example:
 * "House boat" and "Houseboat" normalize to comparable text.
 */
const normalizeConstraintValue = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Check whether a complete normalized phrase exists in a value.
 */
const containsNormalizedPhrase = (value: string, phrase: string): boolean => {
  const normalizedValue = normalizeConstraintValue(value);
  const normalizedPhrase = normalizeConstraintValue(phrase);

  if (!normalizedValue || !normalizedPhrase) {
    return false;
  }

  return ` ${normalizedValue} `.includes(` ${normalizedPhrase} `);
};

/**
 * Check whether a requirement is represented in an itinerary stop.
 *
 * All relevant stop fields are considered because an attraction
 * may be mentioned in its description or activity type rather
 * than its name.
 *
 * The matching is generic and works for different destinations
 * and activity requirements.
 */
const placeMatches = (stop: IItineraryDay["stops"][number], place: string): boolean => {
  const searchableFields = [stop.name, stop.location, stop.description, stop.activityType].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  // First, check for a complete phrase match in any field.
  if (searchableFields.some((field) => containsNormalizedPhrase(field, place))) {
    return true;
  }

  // If the complete phrase does not match, check whether all
  // meaningful words from the requirement appear in the same stop.
  const requiredWords = normalizeConstraintValue(place).split(/\s+/).filter(Boolean);

  if (requiredWords.length === 0) {
    return false;
  }

  return searchableFields.some((field) => {
    const fieldWords = normalizeConstraintValue(field).split(/\s+/).filter(Boolean);

    return requiredWords.every((requiredWord) => fieldWords.includes(requiredWord));
  });
};

export interface AttractionRecommendation {
  name: string;
  description: string;
  reason: string;
  activityType?: string | undefined;
  location?: string | undefined;
}

export interface AttractionRecommendationResult {
  dayNumber: number;
  recommendations: AttractionRecommendation[];
}

export interface DestinationAttractionRecommendationResult {
  destination: string;
  recommendations: AttractionRecommendation[];
}

export interface RescheduleDayInput {
  day: IItineraryDay;
  travelMode: string;
  tripType: string;
  preferences: string[];

  travelLegs: {
    from: string;
    to: string;
    durationMinutes: number | null;
    status: "ESTIMATED" | "UNAVAILABLE";
  }[];

  operatingHours: {
    stopName: string;
    status: "COMPATIBLE" | "INCOMPATIBLE" | "UNKNOWN" | "NEEDS_DATE_CHECK";
    operatingHoursStatus: "AVAILABLE" | "CLOSED" | "UNKNOWN" | "OPEN_24_HOURS";
    openingTime: string | null;
    closingTime: string | null;
    lastEntryTime: string | null;
    operatingPeriods: {
      day: number;
      dayName: string;
      openingTime: string;
      closingTime: string;
    }[];
    issues: string[];
  }[];
}

@injectable()
export class ItineraryGenerationService {
  private readonly _ai: GoogleGenAI;
  private readonly _model: string;

  constructor() {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY4,
    });

    this._model = env.GEMINI_MODEL;
  }

  public async generateItinerary(
    requirements: TripRequirements,
    templates: IItineraryTemplate[],
  ): Promise<GeneratedItinerary> {
    if (
      !requirements.source ||
      requirements.destinations.length === 0 ||
      !requirements.totalDays ||
      requirements.totalDays < 1
    ) {
      throw new Error("Starting location, destination, and trip duration are required.");
    }

    // Prepare retrieved templates as reference context.
    const templateContext =
      templates.length > 0
        ? templates
            .map(
              (template, index) => `
REFERENCE TEMPLATE ${index + 1}

Title: ${template.title}
Source: ${template.source}
Destinations: ${template.destinations.join(", ")}
Duration: ${template.totalDays} days
Travel mode: ${template.travelMode}
Trip type: ${template.tripType}
Preferences: ${template.preferences.join(", ")}

Itinerary:
${JSON.stringify(template.days, null, 2)}
`,
            )
            .join("\n")
        : "No relevant itinerary templates were found. Generate the itinerary from the user's requirements.";

    const activityTypeInstruction =
      requirements.excludedActivityTypes.length > 0
        ? "Provide an activityType for every stop so excluded activity types can be validated."
        : "Include an activityType when it is useful and known.";

    const prompt = `
You are TripNest's AI itinerary generation assistant.

Generate a personalized, day-wise travel itinerary using the user's
requirements and the reference itinerary templates when available.

USER TRIP REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

REFERENCE ITINERARY TEMPLATES:
${templateContext}

INSTRUCTIONS:

1. Generate exactly ${requirements.totalDays} days.

2. Number the days consecutively, starting from 1.

3. Respect the starting location and destination order.

4. Consider the number of travelers, travel mode, trip type,
   preferences, preferred activities, and additional details.

5. The budget is optional. If it is null, do not invent a budget.

6. The start date is optional. If it is null, use relative day
   labels such as Day 1, Day 2, and Day 3.

7. TEMPLATE REUSE AND PERSONALIZATION:

   - When relevant reference templates are provided, use them as
     the primary starting point for itinerary generation.
   - Reuse suitable activities, attractions, and day-wise structure
     from the most relevant template.
   - Preserve useful activities from the reference template unless
     they conflict with the user's requirements.
   - Adapt the itinerary according to the user's destinations,
     trip duration, travel mode, trip type, and preferences.
   - Do not copy irrelevant activities merely because they appear
     in a reference template.
   - If no relevant templates are provided, generate the itinerary
     from the user's requirements.

8. MUST-VISIT REQUIREMENTS (HARD CONSTRAINTS):

   - Every item in mustVisitPlaces MUST be included in the itinerary.
   - Do not silently ignore or replace a requested place or activity.
   - A must-visit requirement can be represented in a stop's name,
     description, location, or activityType.
   - Use clear and explicit wording so the requested experience
     is identifiable in the generated itinerary.
   - If the user requests a particular type of stay or experience,
     include that actual experience, not merely a related activity.
   - For example, an overnight accommodation request must be
     represented as an overnight stay, not just a short visit
     or sightseeing activity.
   - Do not claim that a requirement is fulfilled unless the
     itinerary actually includes it.

9. Do not include any excluded place or excluded activity type.

10. Treat preferred activities as preferences to include where
    practical, not as hard requirements.

11. ${activityTypeInstruction}

12. Do not claim that opening hours, prices, routes, or availability
    have been verified.

13. Do not invent precise travel times or durations without reliable
    supporting information.

14. Include suitable stops for each day.

15. Return only valid JSON. Do not include markdown.


TRAVEL PLANNING RULES:

- Consider realistic travel times between destinations.
- Do not invent precise travel durations when reliable information is unavailable.
- Do not assume a long-distance road journey can be completed within a few hours.
- Account for rest stops and reasonable breaks on long journeys.
- Do not overcrowd the itinerary with too many activities.
- If the trip duration is insufficient for both the outbound and return journeys
  and sightseeing, explain this limitation in the itinerary.
- If the start date is not provided, do not invent a specific calendar date.
- If the budget is not provided, do not assume a specific budget.

Use this JSON structure:

{
  "title": "Trip title",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "description": "Description of the day's plan",
      "stops": [
        {
          "name": "Place or activity",
          "description": "Description of the stop",
          "activityType": "Activity category",
          "location": "Location, if known",
          "startTime": "Suggested time, if appropriate",
          "durationMinutes": 60
        }
      ]
    }
  ]
}

Optional stop properties may be omitted when unavailable.
`;

    // Generate the itinerary using Gemini.
    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini returned an empty itinerary response.");
    }

    // Parse Gemini's JSON response.
    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON for the itinerary.");
    }

    // Validate the response structure.
    const result = generatedItinerarySchema.safeParse(parsed);

    if (!result.success) {
      throw new Error(`Invalid generated itinerary: ${result.error.message}`);
    }

    // Ensure the generated itinerary contains the requested number of days.
    if (result.data.days.length !== requirements.totalDays) {
      throw new Error(
        `Expected ${requirements.totalDays} days, but Gemini generated ${result.data.days.length}.`,
      );
    }

    // Ensure day numbering is consecutive.
    const hasCorrectDayNumbers = result.data.days.every(
      (day, index) => day.dayNumber === index + 1,
    );

    if (!hasCorrectDayNumbers) {
      throw new Error("Generated itinerary day numbers are not consecutive.");
    }

    // Validate all trip requirements before returning the itinerary.
    const validation = this.validateItinerary(result.data.days, requirements);

    if (!validation.isValid) {
      throw new AppError(
        STATUS_CODES.UNPROCESSABLE_ENTITY,
        `Generated itinerary does not satisfy the trip requirements: ${validation.violations.join("; ")}`,
      );
    }

    return result.data;
  }

  public validateItinerary(
    days: IItineraryDay[],
    requirements: TripRequirements,
    candidate?: Pick<IItineraryTemplate, "source" | "destinations" | "totalDays">,
  ): ItineraryValidationResult {
    const stops = days.flatMap((day) => day.stops);
    const violations: string[] = [];

    // Validate trip duration.
    if (requirements.totalDays !== null && days.length !== requirements.totalDays) {
      violations.push(`Expected ${requirements.totalDays} days, but itinerary has ${days.length}`);
    }

    // Validate consecutive day numbering.
    if (days.some((day, index) => day.dayNumber !== index + 1)) {
      violations.push("Itinerary day numbers are not consecutive");
    }

    // Validate retrieved template compatibility.
    if (candidate) {
      if (requirements.totalDays !== null && candidate.totalDays !== requirements.totalDays) {
        violations.push(
          `Candidate duration (${candidate.totalDays} days) does not match the requested duration (${requirements.totalDays ?? "unspecified"} days)`,
        );
      }

      const candidateDestinations = candidate.destinations.map(normalizeConstraintValue);

      const requestedDestinations = requirements.destinations.map((destination) =>
        normalizeConstraintValue(destination.name),
      );

      if (
        candidateDestinations.length !== requestedDestinations.length ||
        candidateDestinations.some(
          (destination, index) => destination !== requestedDestinations[index],
        )
      ) {
        violations.push("Candidate destinations do not match the requested destination order");
      }

      if (
        requirements.source &&
        normalizeConstraintValue(candidate.source) !== normalizeConstraintValue(requirements.source)
      ) {
        violations.push(
          "Candidate starting location does not match the requested starting location",
        );
      }
    }

    // Validate must-visit requirements.
    for (const place of requirements.mustVisitPlaces ?? []) {
      const isIncluded = stops.some((stop) => placeMatches(stop, place));

      if (!isIncluded) {
        violations.push(`Must-visit place "${place}" is missing`);
      }
    }

    // Validate excluded places.
    for (const place of requirements.excludedPlaces ?? []) {
      if (
        stops.some((stop) =>
          [stop.name, stop.location, stop.description].some(
            (value) => value !== undefined && containsNormalizedPhrase(value, place),
          ),
        )
      ) {
        violations.push(`Excluded place "${place}" is included`);
      }
    }

    // Validate excluded activity types.
    if ((requirements.excludedActivityTypes ?? []).length > 0) {
      const untypedStops = stops.filter((stop) => !stop.activityType?.trim());

      if (untypedStops.length > 0) {
        violations.push(
          `Activity types are missing for ${untypedStops.length} stop(s), so excluded activity types cannot be verified`,
        );
      }

      for (const activityType of requirements.excludedActivityTypes) {
        const normalizedActivityType = normalizeConstraintValue(activityType);

        if (
          stops.some((stop) => {
            const activityDetails = [stop.activityType, stop.name, stop.description].filter(
              (value): value is string => value !== undefined,
            );

            return activityDetails.some((value) =>
              containsNormalizedPhrase(value, normalizedActivityType),
            );
          })
        ) {
          violations.push(`Excluded activity type "${activityType}" is included`);
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  public async generateStopDetails(
    placeName: string,
    destination: string,
    dayNumber: number,
    travelMode: string,
    tripType: string,
    preferences: string[],
    existingStops: {
      name: string;
      startTime?: string;
      durationMinutes?: number;
    }[] = [],
    preferredTime?: string,
    operatingHours?: {
      status: string;
      openingTime?: string;
      closingTime?: string;
      regularOpeningHours?: string[];
      unavailableReason?: string;
    },
    expectedArrivalTime?: string,
  ): Promise<IItineraryDay["stops"][number]> {
    const prompt = `
You are TripNest's travel attraction and itinerary scheduling assistant.

Your task is to generate realistic details for an attraction being
added to an existing travel itinerary.

PLACE NAME:
${placeName}

TRIP DESTINATION:
${destination}

TARGET DAY:
Day ${dayNumber}

TRAVEL MODE:
${travelMode}

TRIP TYPE:
${tripType}

TRAVEL PREFERENCES:
${JSON.stringify(preferences)}

EXISTING STOPS ON THE TARGET DAY:
${JSON.stringify(existingStops, null, 2)}

USER'S PREFERRED VISITING TIME:
${preferredTime?.trim() || "Not specified"}

EXPECTED ARRIVAL TIME:
${expectedArrivalTime?.trim() || "Unavailable - do not assume an exact arrival time."}

ATTRACTION OPERATING HOURS:
${JSON.stringify(
  operatingHours ?? {
    status: "UNKNOWN",
    unavailableReason: "Operating hours were not provided.",
  },
  null,
  2,
)}

YOUR TASK:

Generate the attraction description, visiting start time,
and estimated visiting duration.

RULES:

1. PLACE DETAILS

   - Preserve the supplied place name exactly.
   - Do not replace it with another attraction.
   - Write a useful description explaining what travelers
     can experience at this attraction.
   - Provide an appropriate activityType when reasonably known.
   - Provide a location only when reasonably known.
   - Do not invent a precise address.

2. VISITING START TIME

   - Consider the existing attractions and their start times.
   - Consider existing attraction durations when provided.
   - Consider the expected arrival time supplied above.
   - Consider the requested attraction's nature.
   - Consider travel mode, trip type, and user preferences.
   - Consider the attraction's opening and closing times.
   - If the user specifies a preferred visiting time,
     respect it whenever compatible with operating hours.
   - If no preferred time is specified, use the expected
     arrival time when available.
   - If neither is available, choose a reasonable visiting
     time based on the existing itinerary.
   - Do not invent an exact arrival time.

3. VISITING DURATION

   - Estimate the normal visiting duration based on the
     experience the attraction offers.
   - Consider the attraction's size, activities, and nature.
   - Consider the expected available visiting time.
   - Do not use the same generic duration for every attraction.

4. STRICT OPERATING-HOURS AND DURATION RULES

   - Treat the supplied opening and closing times as
     scheduling constraints.

   - Use the actual visiting start time you intend to return
     when estimating the duration.

   - Calculate the expected finishing time:

     Expected finishing time =
     Visiting start time + durationMinutes.

   - The expected finishing time MUST NOT exceed the
     attraction's closing time when a meaningful visit
     can fit before closing.

   - Consider the expected arrival time and operating hours
     together when estimating the available visiting time.

   - If the initially estimated duration exceeds the
     available visiting time, reduce the duration reasonably
     so the visit finishes before closing.

   - After reducing the duration, calculate the expected
     finishing time again.

   - Do not reduce the duration to an unrealistic value
     merely to make the schedule fit.

   - If there is insufficient time for a meaningful visit,
     return the normal estimated duration.
     The TypeScript scheduler will identify the conflict.

   - Never assume that the attraction can remain open
     beyond its supplied closing time.

   - If the attraction is CLOSED, do not schedule a visit.

   - If operating hours are UNKNOWN, estimate a normal
     visiting duration without inventing operating hours.

5. TRAVEL AND SCHEDULING

   - Do not invent travel durations.
   - Travel time is calculated separately by the route service.
   - Do not claim that the complete day's schedule is feasible.
   - The TypeScript scheduler performs the final validation.
   - Do not change the requested day.

6. OUTPUT REQUIREMENTS

   - Return durationMinutes as a positive integer.
   - Return startTime in 12-hour format, for example "01:30 PM".
   - Ensure startTime and durationMinutes are consistent with
     the operating-hours constraints whenever possible.
   - These durations are planning estimates, not verified
     visiting durations.
   - Return only valid JSON without Markdown or additional text.

REQUIRED JSON STRUCTURE:

{
  "name": "${placeName}",
  "description": "Description of the attraction",
  "activityType": "Nature",
  "location": "Location, if reasonably known",
  "startTime": "01:30 PM",
  "durationMinutes": 120
}

The activityType and location fields may be omitted when unknown.

The startTime and durationMinutes fields are required.
`;

    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            description: { type: "STRING" },
            activityType: { type: "STRING" },
            location: { type: "STRING" },
            startTime: { type: "STRING" },
            durationMinutes: { type: "INTEGER" },
          },
          required: ["name", "description", "startTime", "durationMinutes"],
        },
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error(`Gemini returned an empty description for "${placeName}".`);
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error(`Gemini returned invalid JSON for "${placeName}".`);
    }

    const stopSchema = z.object({
      name: z.string().trim().min(1),
      description: z.string().trim().min(1),
      activityType: z.string().trim().min(1).optional(),
      location: z.string().trim().min(1).optional(),
      startTime: z.string().trim().min(1),
      durationMinutes: z.number().int().positive(),
    });

    const result = stopSchema.safeParse(parsed);

    if (!result.success) {
      throw new Error(`Invalid stop details for "${placeName}": ${result.error.message}`);
    }

    if (result.data.name.trim().toLowerCase() !== placeName.trim().toLowerCase()) {
      throw new Error(`Gemini returned a different place name instead of "${placeName}".`);
    }

    const finalStartTime = preferredTime?.trim() || result.data.startTime;

    return {
      name: placeName.trim(),
      description: result.data.description,
      startTime: finalStartTime,
      durationMinutes: result.data.durationMinutes,
      ...(result.data.activityType !== undefined && {
        activityType: result.data.activityType,
      }),
      ...(result.data.location !== undefined && {
        location: result.data.location,
      }),
    };
  }

  public calculateDaySchedule(
    input: RescheduleDayInput,
    dayStartTime = "09:00 AM",
    bufferMinutes = 30,
  ): {
    day: IItineraryDay;
    issues: string[];
  } {
    const { day, travelLegs, operatingHours } = input;

    const issues: string[] = [];

    // Convert 12-hour or 24-hour time into minutes.
    const toMinutes = (time: string): number | null => {
      const value = time.trim();

      const match12 = value.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);

      if (match12) {
        let hours = Number(match12[1]);
        const minutes = Number(match12[2]);
        const period = match12[3]?.toUpperCase();

        if (period === "AM" && hours === 12) hours = 0;
        if (period === "PM" && hours !== 12) hours += 12;

        return hours * 60 + minutes;
      }

      const match24 = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

      if (match24) {
        return Number(match24[1]) * 60 + Number(match24[2]);
      }

      return null;
    };

    // Convert minutes into a readable 12-hour time.
    const formatTime = (minutes: number): string => {
      const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;

      const hours = Math.floor(normalizedMinutes / 60);
      const mins = normalizedMinutes % 60;

      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
    };

    // Format operating-hours values for user-facing messages.
    const formatDisplayTime = (time: string | null | undefined): string => {
      if (!time) {
        return "";
      }

      const minutes = toMinutes(time);

      return minutes !== null ? formatTime(minutes) : time;
    };

    const parsedStart = toMinutes(dayStartTime);

    if (parsedStart === null) {
      throw new Error("Invalid day start time.");
    }

    let nextStart = parsedStart;
    let scheduleComplete = true;

    const scheduledStops = day.stops.map((stop, index) => {
      // Check travel between consecutive attractions.
      if (index > 0) {
        const previousStop = day.stops[index - 1];
        const travelLeg = travelLegs[index - 1];

        if (!previousStop) {
          scheduleComplete = false;
          return stop;
        }

        if (!travelLeg || travelLeg.status !== "ESTIMATED" || travelLeg.durationMinutes === null) {
          issues.push(
            `Travel duration between ${previousStop.name} and ${stop.name} is unavailable.`,
          );

          scheduleComplete = false;
          return stop;
        }

        // Verify that the travel leg matches the actual attractions.
        if (
          travelLeg.from.trim().toLowerCase() !== previousStop.name.trim().toLowerCase() ||
          travelLeg.to.trim().toLowerCase() !== stop.name.trim().toLowerCase()
        ) {
          issues.push(
            `Travel route does not match the expected route between ${previousStop.name} and ${stop.name}.`,
          );

          scheduleComplete = false;
          return stop;
        }

        nextStart += bufferMinutes + travelLeg.durationMinutes;
      }

      if (!scheduleComplete) {
        return stop;
      }

      // Activity duration is required.
      if (!stop.durationMinutes || stop.durationMinutes <= 0) {
        issues.push(`Activity duration is missing or invalid for ${stop.name}.`);

        scheduleComplete = false;
        return stop;
      }

      let duration = stop.durationMinutes;

      const hours = operatingHours.find(
        (item) => item.stopName.trim().toLowerCase() === stop.name.trim().toLowerCase(),
      );

      // Check whether the attraction is closed.
      if (hours?.operatingHoursStatus === "CLOSED") {
        issues.push(`${stop.name} is marked as CLOSED.`);
        scheduleComplete = false;
        return stop;
      }

      // Check known operating hours.
      if (hours?.operatingHoursStatus === "AVAILABLE" && hours.openingTime && hours.closingTime) {
        const opening = toMinutes(hours.openingTime);
        const closing = toMinutes(hours.closingTime);

        if (opening !== null && closing !== null) {
          if (nextStart < opening) {
            nextStart = opening;
          }

          if (nextStart + duration > closing) {
            const availableDuration = closing - nextStart;

            if (availableDuration > 0) {
              console.log(
                `Adjusting duration for ${stop.name}: ${duration} -> ${availableDuration} minutes`,
              );

              duration = availableDuration;
            } else {
              issues.push(
                `${stop.name} cannot fit within its operating hours (${formatDisplayTime(hours.openingTime)} - ${formatDisplayTime(hours.closingTime)}).`,
              );
            }
          }
        }

        // Check last-entry restriction after adjusting start time.
        if (hours.lastEntryTime) {
          const lastEntry = toMinutes(hours.lastEntryTime);

          if (lastEntry !== null && nextStart > lastEntry) {
            issues.push(
              `${stop.name} starts after its last-entry time (${formatDisplayTime(hours.lastEntryTime)}).`,
            );
          }
        }
      }

      // Prevent scheduling beyond the current day.
      if (nextStart + duration > 24 * 60) {
        issues.push(`${stop.name} extends beyond the current day.`);
        scheduleComplete = false;
        return stop;
      }

      const startTime = formatTime(nextStart);

      nextStart += duration;

      return {
        ...stop,
        startTime,
        durationMinutes: duration,
      };
    });

    return {
      day: {
        ...day,
        stops: scheduledStops,
      },
      issues,
    };
  }

  public async rescheduleDay(input: RescheduleDayInput): Promise<IItineraryDay> {
    const { day, travelMode, tripType, preferences, travelLegs, operatingHours } = input;

    if (day.stops.length === 0) {
      return day;
    }

    const MAX_ATTEMPTS = 2;
    const API_MAX_ATTEMPTS = 3;

    // Convert HH:MM AM/PM into minutes after midnight.
    const toMinutes = (time: string): number | null => {
      const value = time.trim();

      const twelveHourMatch = value.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);

      if (twelveHourMatch) {
        let hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2]);
        const period = twelveHourMatch[3]?.toUpperCase();

        if (period === "AM" && hours === 12) {
          hours = 0;
        } else if (period === "PM" && hours !== 12) {
          hours += 12;
        }

        return hours * 60 + minutes;
      }

      const twentyFourHourMatch = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

      if (twentyFourHourMatch) {
        return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
      }

      return null;
    };

    // Convert minutes after midnight into HH:MM AM/PM.
    const formatTime = (totalMinutes: number): string => {
      const normalizedMinutes = totalMinutes % (24 * 60);

      const hours = Math.floor(normalizedMinutes / 60);
      const minutes = normalizedMinutes % 60;

      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
    };

    let lastSchedulingIssues: string[] = [];

    // Generate and validate the schedule.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\n========== DAY ${day.dayNumber} SCHEDULING ATTEMPT ${attempt} ==========\n`);

      const previousIssues =
        attempt > 1
          ? "The previous schedule had these problems:\n" +
            "You MUST correct all of them:\n" +
            lastSchedulingIssues.map((issue) => `- ${issue}`).join("\n")
          : "";

      const prompt = `
You are TripNest's AI travel itinerary scheduling assistant.

Your task is to assign realistic start times to all attractions
in an existing day's itinerary.

DAY DETAILS:

Day number: ${day.dayNumber}
Day title: ${day.title}
Day description: ${day.description}

TRAVEL MODE:
${travelMode}

TRIP TYPE:
${tripType}

PREFERENCES:
${JSON.stringify(preferences)}

ATTRACTIONS:
${JSON.stringify(day.stops, null, 2)}

ESTIMATED TRAVEL TIMES BETWEEN CONSECUTIVE ATTRACTIONS:
${JSON.stringify(travelLegs, null, 2)}

ATTRACTION OPERATING HOURS:
${JSON.stringify(operatingHours, null, 2)}

${previousIssues}

INSTRUCTIONS:

1. Schedule every attraction in the supplied itinerary.

2. Preserve the existing attraction order.
   Do not add, remove, replace, or rename attractions.

3. Preserve the existing durationMinutes for every attraction.

4. Assign an exact startTime to every attraction.

5. Use this time format:
   "08:00 AM", "10:30 AM", "02:00 PM".

6. Consider each attraction's activity duration.

7. Consider the estimated travel time between consecutive attractions.

8. The next attraction must start only after:
   Previous attraction's start time
   + Previous attraction's activity duration
   + Required travel time.

9. Do not schedule overlapping activities.

10. Consider a reasonable starting time for the day.
    Prefer a practical daytime schedule.

11. TRAVEL CONSTRAINTS:
    - Use the supplied travel estimates.
    - If a travel leg is UNAVAILABLE, do not pretend its
      travel duration is known.
    - Do not invent travel durations.

12. OPERATING HOURS:
    - Respect the supplied opening and closing times.
    - Ensure the entire activity duration fits before closing.
    - Respect last-entry restrictions when provided.
    - Never assume closing time and last-entry time are the same.
    - Do not schedule an attraction on a day when it is confirmed CLOSED.
    - If an attraction is OPEN_24_HOURS, it can be scheduled at any time.
    - If operating hours are UNKNOWN, do not invent opening or closing times.
    - If the status is NEEDS_DATE_CHECK, acknowledge the uncertainty.
    - Do not assume weekly operating periods belong to this specific
      itinerary date unless the date is known.

13. If all attractions cannot reasonably fit into one day:
    - Do not shorten activity durations.
    - Do not ignore operating-hour restrictions.
    - Do not invent opening hours.
    - Return the best possible schedule while preserving attraction order.

14. ${
        attempt > 1
          ? "Correct ALL the scheduling problems listed above. Do not repeat the previous conflicts."
          : "Generate a feasible schedule following all the constraints."
      }

15. Return only valid JSON.

REQUIRED JSON STRUCTURE:

{
  "stops": [
    {
      "name": "Attraction name",
      "startTime": "08:00 AM"
    }
  ]
}

Return exactly ${day.stops.length} stops.
`;

      // Call Gemini with retries for temporary API availability errors.
      let response: Awaited<ReturnType<typeof this._ai.models.generateContent>> | undefined;

      for (let apiAttempt = 1; apiAttempt <= API_MAX_ATTEMPTS; apiAttempt++) {
        try {
          console.log(`Gemini scheduling API attempt ${apiAttempt}/${API_MAX_ATTEMPTS}`);

          response = await this._ai.models.generateContent({
            model: this._model,
            contents: prompt,
            config: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  stops: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        name: { type: "STRING" },
                        startTime: { type: "STRING" },
                      },
                      required: ["name", "startTime"],
                    },
                  },
                },
                required: ["stops"],
              },
            },
          });

          break;
        } catch (error) {
          const status = (error as { status?: number }).status;

          if (status !== 503 || apiAttempt === API_MAX_ATTEMPTS) {
            throw error;
          }

          const delay = apiAttempt * 2000;

          console.log(
            `Gemini temporarily unavailable (503). Retrying in ${delay / 1000} seconds...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!response) {
        throw new Error("Gemini failed to generate the day schedule.");
      }

      const responseText = response.text?.trim();

      if (!responseText) {
        throw new Error("Gemini returned an empty day schedule.");
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new Error("Gemini returned invalid JSON for the day schedule.");
      }

      const scheduleSchema = z.object({
        stops: z.array(
          z.object({
            name: z.string().trim().min(1),
            startTime: z
              .string()
              .trim()
              .regex(
                /^(0?[1-9]|1[0-2]):[0-5]\d\s*(AM|PM)$/i,
                "Start time must use the format HH:MM AM/PM.",
              ),
          }),
        ),
      });

      const result = scheduleSchema.safeParse(parsed);

      if (!result.success) {
        throw new Error(`Invalid generated day schedule: ${result.error.message}`);
      }

      // DEBUG LOGS: Inspect original stops and Gemini's response.
      console.log("\n========== DEBUG: ORIGINAL DAY STOPS ==========");
      console.log(JSON.stringify(day.stops, null, 2));

      console.log("\n========== DEBUG: GEMINI SCHEDULE RESPONSE ==========");
      console.log(JSON.stringify(result.data.stops, null, 2));

      console.log("\n========== DEBUG: STOP NAME COMPARISON ==========");

      day.stops.forEach((originalStop, index) => {
        const scheduledStop = result.data.stops[index];

        console.log({
          index,
          originalStopName: originalStop?.name,
          scheduledStopName: scheduledStop?.name,
          originalStopKeys: Object.keys(originalStop ?? {}),
          scheduledStopKeys: Object.keys(scheduledStop ?? {}),
        });
      });

      console.log("====================================================\n");

      if (result.data.stops.length !== day.stops.length) {
        throw new Error("Gemini returned an incorrect number of scheduled stops.");
      }

      // Preserve original attraction details and validate order.
      const updatedStops = day.stops.map((originalStop, index) => {
        const scheduledStop = result.data.stops[index];

        if (
          !scheduledStop ||
          scheduledStop.name.trim().toLowerCase() !== originalStop.name.trim().toLowerCase()
        ) {
          throw new Error(`Gemini changed the attraction order or name for Day ${day.dayNumber}.`);
        }

        return {
          name: originalStop.name,
          description: originalStop.description,
          ...(originalStop.activityType !== undefined && {
            activityType: originalStop.activityType,
          }),
          ...(originalStop.location !== undefined && {
            location: originalStop.location,
          }),
          startTime: scheduledStop.startTime,
          ...(originalStop.durationMinutes !== undefined && {
            durationMinutes: originalStop.durationMinutes,
          }),
        };
      });

      // Automatically adjust start times to satisfy travel-time constraints.
      console.log("\n========== TRAVEL-TIME ADJUSTMENTS ==========");

      for (let index = 0; index < updatedStops.length - 1; index++) {
        const currentStop = updatedStops[index];
        const nextStop = updatedStops[index + 1];
        const travelLeg = travelLegs[index];

        if (!currentStop || !nextStop) {
          continue;
        }

        const currentStart = toMinutes(currentStop.startTime);
        const nextStart = toMinutes(nextStop.startTime);

        if (currentStart === null || nextStart === null) {
          continue;
        }

        const currentEnd = currentStart + (currentStop.durationMinutes ?? 0);

        let earliestNextStart = currentEnd;

        if (travelLeg?.status === "ESTIMATED" && travelLeg.durationMinutes !== null) {
          earliestNextStart += travelLeg.durationMinutes;
        }

        if (nextStart < earliestNextStart) {
          console.log(
            `Adjusting ${nextStop.name}: ${nextStop.startTime} → ${formatTime(earliestNextStart)}`,
          );

          updatedStops[index + 1] = {
            ...nextStop,
            startTime: formatTime(earliestNextStart),
          };
        }
      }

      console.log("=============================================\n");

      console.log("\n========== FINAL SCHEDULE BEFORE VALIDATION ==========");

      updatedStops.forEach((stop, index) => {
        console.log({
          name: stop.name,
          startTime: stop.startTime,
          durationMinutes: stop.durationMinutes,
          travelToNext: travelLegs[index]?.durationMinutes ?? null,
        });
      });

      console.log("======================================================\n");

      // Validate travel time and activity overlaps.
      const schedulingIssues: string[] = [];

      for (let index = 0; index < updatedStops.length - 1; index++) {
        const currentStop = updatedStops[index];
        const nextStop = updatedStops[index + 1];
        const travelLeg = travelLegs[index];

        if (!currentStop || !nextStop) {
          continue;
        }

        const currentStart = toMinutes(currentStop.startTime);
        const nextStart = toMinutes(nextStop.startTime);

        if (currentStart === null || nextStart === null) {
          schedulingIssues.push(
            `Invalid start time found between ${currentStop.name} and ${nextStop.name}.`,
          );
          continue;
        }

        const currentDuration = currentStop.durationMinutes ?? 0;
        const currentEnd = currentStart + currentDuration;

        if (nextStart < currentEnd) {
          schedulingIssues.push(
            `${nextStop.name} overlaps with the previous activity (${currentStop.name}).`,
          );
          continue;
        }

        if (travelLeg?.status === "ESTIMATED" && travelLeg.durationMinutes !== null) {
          const requiredStart = currentEnd + travelLeg.durationMinutes;

          if (nextStart < requiredStart) {
            schedulingIssues.push(
              `Insufficient travel time between ${currentStop.name} and ${nextStop.name}. Required: ${travelLeg.durationMinutes} minutes.`,
            );
          }
        }
      }

      // Validate operating hours.
      const operatingHourIssues: string[] = [];

      console.log("\n========== DEBUG: OPERATING HOURS DATA ==========");
      console.log(JSON.stringify(operatingHours, null, 2));
      console.log("=================================================");

      for (const stop of updatedStops) {
        const hours = operatingHours.find(
          (item) => item.stopName?.trim().toLowerCase() === stop.name?.trim().toLowerCase(),
        );

        if (!hours) {
          continue;
        }

        if (hours.operatingHoursStatus === "UNKNOWN") {
          continue;
        }

        if (hours.operatingHoursStatus === "CLOSED") {
          operatingHourIssues.push(`${stop.name} is marked as CLOSED.`);
          continue;
        }

        if (hours.operatingHoursStatus === "OPEN_24_HOURS") {
          continue;
        }

        if (hours.status === "NEEDS_DATE_CHECK") {
          continue;
        }

        const activityStart = toMinutes(stop.startTime);

        if (activityStart === null) {
          operatingHourIssues.push(`${stop.name} has an invalid start time.`);
          continue;
        }

        const duration = stop.durationMinutes ?? 0;

        if (hours.lastEntryTime) {
          const lastEntry = toMinutes(hours.lastEntryTime);

          if (lastEntry !== null && activityStart > lastEntry) {
            operatingHourIssues.push(
              `${stop.name} starts after its last-entry time (${hours.lastEntryTime}).`,
            );
          }
        }

        if (hours.operatingPeriods.length > 0) {
          const fitsOperatingPeriod = hours.operatingPeriods.some((period) => {
            const opening = toMinutes(period.openingTime);
            const closing = toMinutes(period.closingTime);

            if (opening === null || closing === null) {
              return false;
            }

            const adjustedClosing = closing <= opening ? closing + 24 * 60 : closing;

            const adjustedStart = activityStart < opening ? activityStart + 24 * 60 : activityStart;

            const adjustedEnd = adjustedStart + duration;

            return adjustedStart >= opening && adjustedEnd <= adjustedClosing;
          });

          if (!fitsOperatingPeriod) {
            operatingHourIssues.push(
              `${stop.name} (${stop.startTime}) does not fit within its known operating hours.`,
            );
          }
        } else if (hours.openingTime && hours.closingTime) {
          const opening = toMinutes(hours.openingTime);
          const closing = toMinutes(hours.closingTime);

          if (opening !== null && closing !== null) {
            const adjustedClosing = closing <= opening ? closing + 24 * 60 : closing;

            const adjustedStart = activityStart < opening ? activityStart + 24 * 60 : activityStart;

            const adjustedEnd = adjustedStart + duration;

            if (adjustedStart < opening || adjustedEnd > adjustedClosing) {
              operatingHourIssues.push(
                `${stop.name} (${stop.startTime}) does not fit within its operating hours (${hours.openingTime} - ${hours.closingTime}).`,
              );
            }
          }
        }
      }

      // Combine all validation issues.
      lastSchedulingIssues = [...schedulingIssues, ...operatingHourIssues];

      if (lastSchedulingIssues.length === 0) {
        console.log(`Day ${day.dayNumber} schedule passed validation on attempt ${attempt}.`);

        return {
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          stops: updatedStops,
        };
      }

      console.error(`\nSCHEDULING CONFLICTS ON ATTEMPT ${attempt}:`, lastSchedulingIssues);

      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Unable to generate a feasible schedule for Day ${day.dayNumber} after ${MAX_ATTEMPTS} attempts:\n${lastSchedulingIssues.join("\n")}`,
        );
      }
    }

    throw new Error(`Unable to generate a feasible schedule for Day ${day.dayNumber}.`);
  }

  public async generateAttractionRecommendations(
    itinerary: IItinerary,
    dayNumber: number,
  ): Promise<AttractionRecommendationResult> {
    // 1. Find the requested day.
    const targetDay = itinerary.days.find((day) => day.dayNumber === dayNumber);

    if (!targetDay) {
      throw new Error(`Day ${dayNumber} does not exist in the itinerary.`);
    }

    // 2. Collect attractions already included in the itinerary.
    const existingAttractions = itinerary.days.flatMap((day) => day.stops.map((stop) => stop.name));

    // 3. Prepare the context for Gemini.
    const prompt = `
You are TripNest's AI travel recommendation assistant.

Recommend alternative attractions and activities for an existing travel itinerary.

TRIP DETAILS:

Starting location: ${itinerary.source}

Destinations: ${itinerary.destinations.join(", ")}

Travel mode: ${itinerary.travelMode}

Trip type: ${itinerary.tripType}

Travel preferences: ${JSON.stringify(itinerary.preferences)}

TARGET DAY:

Day ${dayNumber}

Day title: ${targetDay.title}

Day description: ${targetDay.description}

ATTRACTIONS ALREADY PLANNED FOR THIS DAY:

${JSON.stringify(targetDay.stops, null, 2)}

ATTRACTIONS ALREADY INCLUDED IN THE COMPLETE ITINERARY:

${JSON.stringify(existingAttractions)}

EXCLUDED PLACES:

${JSON.stringify(itinerary.excludedPlaces)}

EXCLUDED ACTIVITY TYPES:

${JSON.stringify(itinerary.excludedActivityTypes)}

YOUR TASK:

Recommend 3 to 5 alternative attractions or activities
that the user could consider visiting on Day ${dayNumber}.

RULES:

1. Recommend attractions relevant to the trip destinations.
2. Prefer attractions that fit geographically with the existing day's plan.
3. Consider the user's travel mode, trip type and preferences.
4. Do not recommend attractions already included in the itinerary.
5. Do not recommend excluded places.
6. Do not recommend excluded activity types.
7. Do not invent precise travel durations, opening hours or ticket prices.
8. Do not claim that route feasibility or availability has been verified.
9. Provide a meaningful description for every recommendation.
10. Explain briefly why each recommendation may suit this particular day.
11. Return only valid JSON.

REQUIRED JSON STRUCTURE:

{
  "dayNumber": ${dayNumber},
  "recommendations": [
    {
      "name": "Attraction name",
      "description": "Description of the attraction",
      "reason": "Why it is suitable for this day",
      "activityType": "Nature",
      "location": "Location"
    }
  ]
}
`;

    // 4. Ask Gemini to generate recommendations.
    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini returned an empty attraction recommendation response.");
    }

    // 5. Parse the response.
    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON for attraction recommendations.");
    }

    // 6. Validate the response.
    const recommendationSchema = z.object({
      dayNumber: z.number().int().positive(),
      recommendations: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            description: z.string().trim().min(1),
            reason: z.string().trim().min(1),
            activityType: z.string().optional(),
            location: z.string().optional(),
          }),
        )
        .min(1),
    });

    const result = recommendationSchema.safeParse(parsed);

    if (!result.success) {
      throw new Error(`Invalid attraction recommendations: ${result.error.message}`);
    }

    if (result.data.dayNumber !== dayNumber) {
      throw new Error("Gemini returned recommendations for an incorrect day.");
    }

    return result.data;
  }

  public async generateAttractionRecommendationsForDestination(
    destination: string,
  ): Promise<DestinationAttractionRecommendationResult> {
    const normalizedDestination = destination.trim();

    if (!normalizedDestination) {
      throw new Error("Please provide a destination for attraction recommendations.");
    }

    const prompt = `
You are TripNest's AI travel recommendation assistant.

Your task is to recommend interesting attractions and activities
for a traveler visiting a particular destination.

DESTINATION:
${normalizedDestination}

YOUR TASK:

Recommend 5 interesting tourist attractions or activities
that travelers can explore in this destination.

RULES:

1. Recommend real attractions and activities relevant to the destination.
2. Include variety, such as historical places, nature, cultural attractions,
   museums, landmarks, and activities.
3. Do not recommend places belonging to unrelated destinations.
4. Avoid repeating attractions.
5. Provide a meaningful description for each attraction.
6. Explain why each attraction is worth visiting.
7. Do not invent precise travel durations, opening hours, ticket prices,
   or availability.
8. Do not claim that route feasibility or availability has been verified.
9. Return 5 recommendations when possible.
10. Return only valid JSON.

REQUIRED JSON STRUCTURE:

{
  "destination": "Destination name",
  "recommendations": [
    {
      "name": "Attraction name",
      "description": "Description of the attraction",
      "reason": "Why the traveler should visit this attraction",
      "activityType": "Historical",
      "location": "Location"
    }
  ]
}
`;

    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini returned an empty destination attraction recommendation response.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON for destination attraction recommendations.");
    }

    const recommendationSchema = z.object({
      destination: z.string().trim().min(1),
      recommendations: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            description: z.string().trim().min(1),
            reason: z.string().trim().min(1),
            activityType: z.string().optional(),
            location: z.string().optional(),
          }),
        )
        .min(1),
    });

    const result = recommendationSchema.safeParse(parsed);

    if (!result.success) {
      throw new Error(`Invalid destination attraction recommendations: ${result.error.message}`);
    }

    if (result.data.destination.trim().toLowerCase() !== normalizedDestination.toLowerCase()) {
      throw new Error("Gemini returned recommendations for an incorrect destination.");
    }

    return result.data;
  }
}
