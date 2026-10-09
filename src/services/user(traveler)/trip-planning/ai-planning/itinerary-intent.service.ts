import { env } from "@/config/env";
import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";

export type ItineraryAction = "CREATE" | "MODIFY" | null;

export interface ItineraryIntentResult {
  itineraryRequested: boolean;
  itineraryAction: ItineraryAction;
}

@injectable()
export class ItineraryIntentService {
  private readonly _ai: GoogleGenAI;
  private readonly _model: string;

  constructor() {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY3,
    });

    this._model = env.GEMINI_MODEL;
  }

  async detectIntent(userMessage: string): Promise<ItineraryIntentResult> {
    const prompt = `
You are an intent classification system for a travel planning application.

Your task is to determine whether the user's message is requesting an
ITINERARY action.

There are only two possible itinerary actions:

1. CREATE
   The user wants to create, generate, prepare, build, or get a new
   day-wise travel itinerary.

2. MODIFY
   The user wants to change, update, edit, remove, add, replace, reorder,
   or otherwise modify an existing itinerary.

If the user is only asking for general travel information, destination
information, recommendations, attractions, activities, restaurants,
weather, transportation information, etc., it is NOT an itinerary action.

Examples:

User: "Create an itinerary for my trip"
Result: CREATE

User: "Can you plan my trip day by day?"
Result: CREATE

User: "Give me a 3 day plan for Wayanad"
Result: CREATE

User: "What can I visit in Wayanad?"
Result: NONE

User: "Tell me about Edakkal Caves"
Result: NONE

User: "Which places should I visit in Wayanad?"
Result: NONE

User: "Remove Edakkal Caves from day 2"
Result: MODIFY

User: "Add Soochipara Falls to my itinerary"
Result: MODIFY

User: "Change my second day"
Result: MODIFY

User: "Replace Banasura Dam with Pookode Lake"
Result: MODIFY

User: "What is the best time to visit Wayanad?"
Result: NONE

Important:
- Do not infer an itinerary request just because the conversation is about
  travel planning.
- The user must be asking to create or modify an itinerary.
- Return ONLY valid JSON.
- Do not include markdown.
- Do not include explanations.

Required JSON format:

{
  "itineraryRequested": true | false,
  "itineraryAction": "CREATE" | "MODIFY" | null
}

User message:
"${userMessage}"
`;

    try {
      const response = await this._ai.models.generateContent({
        model: this._model,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim();

      if (!text) {
        return this._emptyResult();
      }

      const parsed = JSON.parse(text);

      return this._validateResult(parsed);
    } catch (error) {
      console.error("Failed to detect itinerary intent:", error);

      return this._emptyResult();
    }
  }

  private _validateResult(result: Partial<ItineraryIntentResult>): ItineraryIntentResult {
    if (result.itineraryRequested !== true && result.itineraryRequested !== false) {
      return this._emptyResult();
    }

    if (!result.itineraryRequested) {
      return {
        itineraryRequested: false,
        itineraryAction: null,
      };
    }

    if (result.itineraryAction !== "CREATE" && result.itineraryAction !== "MODIFY") {
      return this._emptyResult();
    }

    return {
      itineraryRequested: true,
      itineraryAction: result.itineraryAction,
    };
  }

  private _emptyResult(): ItineraryIntentResult {
    return {
      itineraryRequested: false,
      itineraryAction: null,
    };
  }
}
