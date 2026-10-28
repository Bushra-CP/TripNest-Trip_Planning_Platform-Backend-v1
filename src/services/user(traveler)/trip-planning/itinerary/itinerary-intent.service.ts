import { env } from "@/config/env";
import { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";
import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";
import z from "zod";

export type ItineraryAction = "CREATE" | "MODIFY" | null;

export type UserConfirmation = "YES" | "NO" | null;

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
      apiKey: env.GOOGLE_API_KEY2,
    });

    this._model = env.GEMINI_MODEL;
  }

  /**
   * Detect whether the user wants to create or modify
   * a travel itinerary.
   *
   * @param {string} userMessage
   * @return {*}  {Promise<ItineraryIntentResult>}
   * @memberof ItineraryIntentService
   */
  async detectIntent(userMessage: string): Promise<ItineraryIntentResult> {
    const prompt = `
You are an intent classification system for a travel planning application.

Determine whether the user's message explicitly requests an itinerary action.

Possible actions:

1. CREATE
   The user wants to create, generate, prepare, build, or receive a new
   day-wise travel itinerary.

2. MODIFY
   The user wants to change, update, edit, remove, add, replace, or reorder
   something in an existing itinerary.

3. NONE
   The user is asking for general travel information, providing trip details,
   answering a planning question, confirming a pending request, or discussing
   travel without explicitly requesting itinerary creation or modification.

Examples:

User: "Create an itinerary for my trip"
Result: CREATE

User: "Can you plan my trip day by day?"
Result: CREATE

User: "Give me a 3 day plan for Wayanad"
Result: CREATE

User: "What can I visit in Wayanad?"
Result: NONE

User: "Remove Edakkal Caves from day 2"
Result: MODIFY

User: "Add Soochipara Falls to my itinerary"
Result: MODIFY

User: "Yes, please generate it"
Result: NONE

User: "Sure, go ahead"
Result: NONE

Important:
- Do not infer an itinerary request merely because the conversation concerns travel.
- A confirmation or rejection of a pending request is not a new itinerary request.
- Return only valid JSON.
- Do not include explanations or markdown.

Required JSON format:

{
  "itineraryRequested": true | false,
  "itineraryAction": "CREATE" | "MODIFY" | null
}

User message:
${JSON.stringify(userMessage)}
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

      const parsed: unknown = JSON.parse(text);

      return this._validateResult(parsed);
    } catch (error) {
      console.error("Failed to detect itinerary intent:", error);

      return this._emptyResult();
    }
  }

  /**
   * Detect whether the user confirms, rejects, or has not
   * clearly decided about a pending itinerary action.
   *
   * @param {string} userMessage
   * @return {*}  {Promise<UserConfirmation>}
   * @memberof ItineraryIntentService
   */
  async detectConfirmation(userMessage: string): Promise<UserConfirmation> {
    const prompt = `
You are a confirmation classifier for a travel planning application.

The assistant has asked the user to confirm a pending action,
such as creating or modifying a travel itinerary.

Classify the user's latest message into exactly one category:

YES:
The user clearly agrees, approves, confirms, or asks the assistant
to proceed with the pending action.

Examples:
- "Yes"
- "Yes, please"
- "Sure, go ahead"
- "That sounds good"
- "Please proceed"
- "Okay, generate it"
- "Absolutely, let's do it"
- "Go ahead and create the itinerary"

NO:
The user clearly rejects, declines, cancels, or asks not to proceed
with the pending action.

Examples:
- "No"
- "No, thanks"
- "Don't generate it"
- "Cancel the request"
- "I changed my mind"
- "No, let me make some changes first"

UNCLEAR:
The user does not clearly confirm or reject the pending action.

Examples:
- "Maybe"
- "What will the itinerary include?"
- "Can you explain more?"
- "I want to change the destination"
- "What about the budget?"
- "I'm not sure yet"

Important rules:
- Interpret the meaning of the complete message, not just individual words.
- Do not classify a question as YES merely because it contains a positive word.
- If the user expresses uncertainty, classify it as UNCLEAR.
- If the user requests changes before proceeding, classify it as UNCLEAR.
- If the message contains both agreement and a clear cancellation, classify it as NO.
- Do not assume confirmation when the meaning is ambiguous.
- Return only valid JSON.
- Do not include markdown or explanations.

Required JSON format:

{
  "confirmation": "YES" | "NO" | "UNCLEAR"
}

User message:
${JSON.stringify(userMessage)}
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
        return null;
      }

      const parsed: unknown = JSON.parse(text);

      if (typeof parsed !== "object" || parsed === null || !("confirmation" in parsed)) {
        return null;
      }

      const confirmation = parsed.confirmation;

      if (confirmation === "YES" || confirmation === "NO") {
        return confirmation;
      }

      if (confirmation === "UNCLEAR") {
        return null;
      }

      return null;
    } catch (error) {
      console.error("Failed to detect user confirmation:", error);

      return null;
    }
  }

  /**
   * extractModification
   *
   * @param {string} userMessage
   * @return {*}  {(Promise<PendingItineraryChange | null>)}
   * @memberof ItineraryIntentService
   */
  public async extractModification(userMessage: string): Promise<PendingItineraryChange> {
    const prompt = `
You are TripNest's itinerary modification request extractor.

Extract the user's requested changes to an existing travel itinerary.

USER MESSAGE:
${JSON.stringify(userMessage)}

YOUR TASK:
Extract additions, removals, and replacements.

Return all three arrays, even when an array is empty.

1. ADD PLACES

For every requested addition, extract:
- name: destination name.
- dayNumber: explicitly specified day number, otherwise null.
- insertBefore: destination the new place must appear immediately before, otherwise null.
- insertAfter: destination the new place must appear immediately after, otherwise null.
- preferredTime: the requested visiting time expressed as a natural-language string, otherwise null.

Examples:
- "Add Cheeyappara Waterfalls before Munnar Tea Gardens in the morning."
  -> name: "Cheeyappara Waterfalls"
  -> insertBefore: "Munnar Tea Gardens"
  -> preferredTime: "Morning"

- "Add Echo Point after Mattupetty Dam in the late afternoon."
  -> name: "Echo Point"
  -> insertAfter: "Mattupetty Dam"
  -> preferredTime: "Late Afternoon"

- "Add Pookode Lake to day 2."
  -> dayNumber: 2
  -> insertBefore: null
  -> insertAfter: null
  -> preferredTime: null

- "Add a waterfall visit before lunch."
  Extract the requested place only if the user identifies a specific destination.
  Do not invent a destination name.

IMPORTANT:
- Do not invent a day, insertion position, or preferred time.
- Do not convert a missing preference into a default time.
- Do not use a predefined list of permitted time labels.
- Extract the user's requested time in natural language.
- If the user specifies both insertBefore and insertAfter, preserve both values.
  Do not silently choose one over the other.
- A position may refer to an existing destination by its name.

2. REMOVE PLACES

For every requested removal, extract:
- name: destination to remove.
- dayNumber: explicitly specified day number, otherwise null.

Do not invent a day number.

3. REPLACE PLACES

For every requested replacement, extract:
- remove: existing destination to replace.
- add: replacement destination.
- dayNumber: explicitly specified day number, otherwise null.
- preferredTime: requested visiting time for the replacement, otherwise null.

A replacement should preserve the original destination's position unless the user explicitly requests a different position.

Do not treat a simple addition as a replacement.

4. DESCRIPTION

Provide a concise, natural-language description of the requested modifications.

5. EXTRACTION RULES

- Extract only changes explicitly requested by the user.
- Use null for unspecified optional values.
- Do not add explanations or recommendations.
- If a user requests multiple changes, extract all of them.
- Do not treat examples in these instructions as actual requested changes.
- Do not invent destination names.
- Return valid JSON only.

REQUIRED JSON STRUCTURE:

{
  "addPlaces": [
    {
      "name": "Cheeyappara Waterfalls",
      "dayNumber": null,
      "insertBefore": "Munnar Tea Gardens",
      "insertAfter": null,
      "preferredTime": "Morning"
    }
  ],
  "removePlaces": [],
  "replacePlaces": [],
  "description": "Add Cheeyappara Waterfalls before Munnar Tea Gardens in the morning."
}

The example above illustrates the structure only. Your output must reflect the actual user message.

Return only valid JSON without Markdown or code fences.
`;

    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            addPlaces: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  dayNumber: {
                    type: "INTEGER",
                    nullable: true,
                  },
                  insertBefore: {
                    type: "STRING",
                    nullable: true,
                  },
                  insertAfter: {
                    type: "STRING",
                    nullable: true,
                  },
                  preferredTime: {
                    type: "STRING",
                    nullable: true,
                  },
                },
                required: ["name", "dayNumber", "insertBefore", "insertAfter", "preferredTime"],
              },
            },
            removePlaces: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  dayNumber: {
                    type: "INTEGER",
                    nullable: true,
                  },
                },
                required: ["name", "dayNumber"],
              },
            },
            replacePlaces: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  remove: { type: "STRING" },
                  add: { type: "STRING" },
                  dayNumber: {
                    type: "INTEGER",
                    nullable: true,
                  },
                  preferredTime: {
                    type: "STRING",
                    nullable: true,
                  },
                },
                required: ["remove", "add", "dayNumber", "preferredTime"],
              },
            },
            description: { type: "STRING" },
          },
          required: ["addPlaces", "removePlaces", "replacePlaces", "description"],
        },
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini returned an empty itinerary modification response.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON for the itinerary modification.");
    }

    const nullableString = z.string().trim().min(1).nullable();

    const schema = z.object({
      addPlaces: z.array(
        z.object({
          name: z.string().trim().min(1),
          dayNumber: z.number().int().positive().nullable(),
          insertBefore: nullableString,
          insertAfter: nullableString,
          preferredTime: nullableString,
        }),
      ),
      removePlaces: z.array(
        z.object({
          name: z.string().trim().min(1),
          dayNumber: z.number().int().positive().nullable(),
        }),
      ),
      replacePlaces: z.array(
        z.object({
          remove: z.string().trim().min(1),
          add: z.string().trim().min(1),
          dayNumber: z.number().int().positive().nullable(),
          preferredTime: nullableString,
        }),
      ),
      description: z.string(),
    });

    const result = schema.safeParse(parsed);

    if (!result.success) {
      console.error(
        "Invalid Gemini itinerary modification response:",
        JSON.stringify(parsed, null, 2),
      );

      throw new Error(`Invalid itinerary modification response: ${result.error.message}`);
    }

    const modification = result.data;

    const hasChanges =
      modification.addPlaces.length > 0 ||
      modification.removePlaces.length > 0 ||
      modification.replacePlaces.length > 0;

    if (!hasChanges) {
      throw new Error("No valid itinerary modifications could be extracted from the request.");
    }

    return {
      addPlaces: modification.addPlaces.map((place) => ({
        name: place.name,
        ...(place.dayNumber !== null ? { dayNumber: place.dayNumber } : {}),
        ...(place.insertBefore !== null ? { insertBefore: place.insertBefore } : {}),
        ...(place.insertAfter !== null ? { insertAfter: place.insertAfter } : {}),
        ...(place.preferredTime !== null ? { preferredTime: place.preferredTime } : {}),
      })),

      removePlaces: modification.removePlaces.map((place) => ({
        name: place.name,
        ...(place.dayNumber !== null ? { dayNumber: place.dayNumber } : {}),
      })),

      replacePlaces: modification.replacePlaces.map((place) => ({
        remove: place.remove,
        add: place.add,
        ...(place.dayNumber !== null ? { dayNumber: place.dayNumber } : {}),
        ...(place.preferredTime !== null ? { preferredTime: place.preferredTime } : {}),
      })),

      description: modification.description.trim(),
    };
  }

  /**
   * Validate the LLM's itinerary intent result.
   *
   * @private
   * @param {unknown} result
   * @return {*}  {ItineraryIntentResult}
   * @memberof ItineraryIntentService
   */
  private _validateResult(result: unknown): ItineraryIntentResult {
    if (
      typeof result !== "object" ||
      result === null ||
      !("itineraryRequested" in result) ||
      !("itineraryAction" in result)
    ) {
      return this._emptyResult();
    }

    const parsed = result as Partial<ItineraryIntentResult>;

    if (parsed.itineraryRequested !== true && parsed.itineraryRequested !== false) {
      return this._emptyResult();
    }

    if (!parsed.itineraryRequested) {
      return this._emptyResult();
    }

    if (parsed.itineraryAction !== "CREATE" && parsed.itineraryAction !== "MODIFY") {
      return this._emptyResult();
    }

    return {
      itineraryRequested: true,
      itineraryAction: parsed.itineraryAction,
    };
  }

  /**
   * Return a safe default when intent detection fails.
   *
   * @private
   * @return {*}  {ItineraryIntentResult}
   * @memberof ItineraryIntentService
   */
  private _emptyResult(): ItineraryIntentResult {
    return {
      itineraryRequested: false,
      itineraryAction: null,
    };
  }
}
