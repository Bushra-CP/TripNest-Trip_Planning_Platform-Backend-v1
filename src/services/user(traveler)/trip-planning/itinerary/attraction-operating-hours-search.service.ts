// Search for operating hours of tourist attractions using Google Gemini AI

import { injectable } from "inversify";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/config/env";

import type { AttractionOperatingHours } from "@/interfaces/trip-planning/itinerary/attraction-operating-hours.interfaces";

@injectable()
export class AttractionOperatingHoursSearchService {
  private readonly ai = new GoogleGenAI({
    apiKey: env.GOOGLE_API_KEY5,
  });

  public async searchOperatingHours(placeName: string): Promise<AttractionOperatingHours> {
    console.log("\n========== GEMINI OPERATING HOURS SEARCH ==========");

    console.log("Testing attraction:", placeName);
    console.log("Model:", env.GEMINI_MODEL);

    try {
      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,

        contents: `
          Find the operating hours for the following tourist attraction:

          Attraction: ${placeName}

          Return ONLY a valid JSON object with this structure:

          {
            "placeName": "string",
            "openingTime": "HH:mm or null",
            "closingTime": "HH:mm or null",
            "closedDays": [],
            "seasonalClosure": {
              "isClosed": false,
              "months": [],
              "reason": null
            },
            "lastEntryTime": "HH:mm or null",
            "sourceUrls": [],
            "confidence": "unverified",
            "status": "FOUND or UNKNOWN"
          }

          Rules:

          1. Return only JSON. Do not include markdown or explanations.
          2. Use 24-hour time format.
          3. Use null when opening or closing times are unavailable.
          4. Do not invent operating hours or closing days.
          5. Include source URLs only if you know the actual URLs.
          6. Set status to UNKNOWN if reliable information is unavailable.
          7. Set confidence to "unverified" because this information
             has not been independently verified.
        `,
      });

      const responseText = response.text ?? "";

      console.log("\nGEMINI RAW RESPONSE:");
      console.log(responseText);

      const cleanedResponse = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const result = JSON.parse(cleanedResponse) as {
        placeName: string;
        openingTime: string | null;
        closingTime: string | null;
        closedDays: string[];
        seasonalClosure: {
          isClosed: boolean;
          months: string[];
          reason: string | null;
        };
        lastEntryTime: string | null;
        sourceUrls: string[];
        confidence: string;
        status: "FOUND" | "UNKNOWN";
      };

      console.log("\nPARSED GEMINI RESPONSE:");
      console.dir(result, { depth: null });

      // Check whether usable operating hours were returned.
      if (result.status === "UNKNOWN" || !result.openingTime || !result.closingTime) {
        return {
          placeName: result.placeName || placeName,
          closedDays: result.closedDays ?? [],
          verified: false,
          status: "UNKNOWN",
          source: "Google Gemini AI",
          unavailableReason: "Gemini could not provide complete operating hours.",
        };
      }

      const operatingHours: AttractionOperatingHours = {
        placeName: result.placeName || placeName,

        openingTime: result.openingTime,
        closingTime: result.closingTime,

        ...(result.lastEntryTime && {
          lastEntryTime: result.lastEntryTime,
        }),

        closedDays: result.closedDays ?? [],

        seasonalClosure: result.seasonalClosure,

        sourceUrls: result.sourceUrls ?? [],

        confidence: "unverified",

        source: "Google Gemini AI",

        verified: false,

        status: "AVAILABLE",
      };

      console.log("\nFINAL GEMINI OPERATING HOURS:");
      console.dir(operatingHours, { depth: null });

      console.log("\n===================================================\n");

      return operatingHours;
    } catch (error) {
      console.error("Gemini operating hours search failed:", error);

      return {
        placeName,
        closedDays: [],
        verified: false,
        status: "UNKNOWN",
        source: "Google Gemini AI",
        unavailableReason: "Unable to retrieve operating hours from Gemini.",
      };
    }
  }
}
