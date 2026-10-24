import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";
import { z } from "zod";
import { env } from "@/config/env";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import type {
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

const normalizeConstraintValue = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const containsNormalizedPhrase = (value: string, phrase: string): boolean => {
  const normalizedValue = normalizeConstraintValue(value);
  const normalizedPhrase = normalizeConstraintValue(phrase);

  return ` ${normalizedValue} `.includes(` ${normalizedPhrase} `);
};

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

8. Include every must-visit place and do not include any excluded
   place or excluded activity type.
9. Treat preferred activities as preferences to include where
   practical, not as hard requirements.
10. ${activityTypeInstruction}
11. Do not claim that opening hours, prices, routes, or availability
   have been verified.
12. Do not invent precise travel times or durations without reliable
   supporting information.
13. Include suitable stops for each day.
14. Return only valid JSON. Do not include markdown.


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
    if (requirements.totalDays !== null && days.length !== requirements.totalDays) {
      violations.push(`Expected ${requirements.totalDays} days, but itinerary has ${days.length}`);
    }

    if (days.some((day, index) => day.dayNumber !== index + 1)) {
      violations.push("Itinerary day numbers are not consecutive");
    }

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

    const placeMatches = (stop: IItineraryDay["stops"][number], place: string): boolean => {
      const normalizedPlace = normalizeConstraintValue(place);

      return [stop.name, stop.location].some(
        (value) => value !== undefined && normalizeConstraintValue(value) === normalizedPlace,
      );
    };

    for (const place of requirements.mustVisitPlaces) {
      if (!stops.some((stop) => placeMatches(stop, place))) {
        violations.push(`Must-visit place "${place}" is missing`);
      }
    }

    for (const place of requirements.excludedPlaces) {
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

    if (requirements.excludedActivityTypes.length > 0) {
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
}
