import { env } from "@/config/env";
import { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";
import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";
import z from "zod";

export type ItineraryAction = "CREATE" | "MODIFY" | null;

export type UserConfirmation = "YES" | "NO" | null;

export type ModificationConfirmationIntent = "CONFIRM" | "REJECT" | "MODIFY" | "CLARIFY";

export interface ModificationConfirmationResult {
  intent: ModificationConfirmationIntent;
  message: string;
  updatedRequest: string | null;
}

export interface ItineraryIntentResult {
  itineraryRequested: boolean;
  itineraryAction: ItineraryAction;
}

export interface AttractionRecommendationIntent {
  recommendationRequested: boolean;
  dayNumber: number | null;
}

export interface RecommendedAttraction {
  name: string;
  reason: string;
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
   * Detect a YES/NO confirmation for itinerary creation.
   * Modification confirmations are handled by interpretModificationResponse().
   */
  async detectConfirmation(userMessage: string): Promise<UserConfirmation> {
    const prompt = `
You are a confirmation classifier for a travel planning application.

The assistant has asked the user to confirm a pending itinerary creation request.

Classify the user's message as YES, NO, or UNCLEAR.

YES means the user clearly agrees or asks the assistant to proceed.
Examples: "Yes", "Sure, go ahead", "That sounds good", "Please generate it".

NO means the user clearly rejects or cancels the request.
Examples: "No", "Don't generate it", "Cancel the request", "I changed my mind".

UNCLEAR means the user asks a question, expresses uncertainty, or requests changes.
Examples: "Maybe", "Can you explain more?", "I want to change the destination".

Rules:
- Understand the complete meaning.
- Do not classify questions or ambiguous messages as YES.
- Return valid JSON only.

Required JSON:
{ "confirmation": "YES" | "NO" | "UNCLEAR" }

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
      if (!text) return null;

      const parsed: unknown = JSON.parse(text);
      const schema = z.object({
        confirmation: z.enum(["YES", "NO", "UNCLEAR"]),
      });

      const result = schema.safeParse(parsed);
      if (!result.success) {
        console.error("Invalid itinerary creation confirmation:", result.error.message);
        return null;
      }

      return result.data.confirmation === "UNCLEAR" ? null : result.data.confirmation;
    } catch (error) {
      console.error("Failed to detect user confirmation:", error);
      return null;
    }
  }

  /**
   * Interpret a user's response to a proposed itinerary modification.
   */
  async interpretModificationResponse(
    userMessage: string,
  ): Promise<ModificationConfirmationResult> {
    const prompt = `
You are a confirmation interpreter for TripNest, an AI travel planning application.

The assistant has presented proposed changes to the user's existing itinerary
and asked whether the user wants to apply them.

Classify the user's latest message into exactly one intent:

CONFIRM:
The user clearly approves the proposed changes.
Examples: "Yes", "Go ahead", "That looks good", "Please apply the changes".

REJECT:
The user clearly rejects the proposed changes.
Examples: "No", "Keep my original itinerary", "Cancel this modification".

MODIFY:
The user wants to change the proposal before approving it.
Examples: "Move Chembra Peak to Day 3", "Remove Edakkal Caves",
"Yes, but move Chembra Peak to Day 3".

CLARIFY:
The user asks a question, requests an explanation, expresses uncertainty,
or does not clearly confirm, reject, or modify.
Examples: "Why is the travel time so long?", "Can you explain?",
"I'm not sure", "Maybe".

Rules:
- Understand the complete meaning, not just individual words.
- Do not classify a question as CONFIRM.
- A requested change must be MODIFY, not CONFIRM.
- If the user both agrees and requests a change, classify as MODIFY.
- For MODIFY, put only the requested changes in updatedRequest.
- For other intents, updatedRequest must be null.
- Do not invent modification requests.
- Return valid JSON only.

Required JSON:
{
  "intent": "CONFIRM" | "REJECT" | "MODIFY" | "CLARIFY",
  "message": "A short helpful response.",
  "updatedRequest": "The requested changes, or null."
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
      if (!text) return this._emptyModificationConfirmationResult();

      const parsed: unknown = JSON.parse(text);
      const schema = z.object({
        intent: z.enum(["CONFIRM", "REJECT", "MODIFY", "CLARIFY"]),
        message: z.string(),
        updatedRequest: z.string().nullable(),
      });

      const result = schema.safeParse(parsed);
      if (!result.success) {
        console.error("Invalid modification confirmation response:", result.error.message);
        return this._emptyModificationConfirmationResult();
      }

      const updatedRequest = result.data.updatedRequest?.trim() || null;
      if (result.data.intent === "MODIFY" && !updatedRequest) {
        return this._emptyModificationConfirmationResult();
      }

      return {
        intent: result.data.intent,
        message: result.data.message.trim(),
        updatedRequest,
      };
    } catch (error) {
      console.error("Failed to interpret modification confirmation:", error);
      return this._emptyModificationConfirmationResult();
    }
  }

  private _emptyModificationConfirmationResult(): ModificationConfirmationResult {
    return {
      intent: "CLARIFY",
      message:
        "I'm not sure I understood. Would you like to apply the proposed changes, or modify them?",
      updatedRequest: null,
    };
  }

  /**
   * Detect whether the user is requesting attraction recommendations.
   *
   * @param userMessage
   * @param conversationHistory
   */
  async detectRecommendationRequest(
    userMessage: string,
    conversationHistory: string,
  ): Promise<AttractionRecommendationIntent> {
    const prompt = `
You are an intent detection system for TripNest, a travel planning application.

Your task is to identify ONLY explicit requests for attraction or activity recommendations.

IMPORTANT: Distinguish attraction recommendations from itinerary creation.

CLASSIFY AS RECOMMENDATION (true):

The user specifically asks for suggestions, recommendations, or a list of
places or activities to visit.

Examples:

User: "Suggest some activities for Day 2."
Result: {"recommendationRequested": true, "dayNumber": 2}

User: "Can you recommend other places to visit?"
Result: {"recommendationRequested": true, "dayNumber": null}

User: "What places can I explore on Day 1?"
Result: {"recommendationRequested": true, "dayNumber": 1}

User: "What else can I explore that day?"
Result: Use conversation history to identify the day.
If the day cannot be identified, return null.

CLASSIFY AS NOT A RECOMMENDATION (false):

1. Itinerary creation requests.

Examples:

User: "I want an itinerary for this trip."
Result: {"recommendationRequested": false, "dayNumber": null}

User: "Create a 3-day itinerary for Wayanad."
Result: {"recommendationRequested": false, "dayNumber": null}

User: "Plan my trip day by day."
Result: {"recommendationRequested": false, "dayNumber": null}

2. Itinerary modification requests.

User: "Add Pookode Lake to Day 2."
Result: {"recommendationRequested": false, "dayNumber": null}

User: "Remove Mattupetty Dam from Day 2."
Result: {"recommendationRequested": false, "dayNumber": null}

3. General travel questions.

User: "What is the distance between Wayanad and Palakkad?"
Result: {"recommendationRequested": false, "dayNumber": null}

IMPORTANT RULES:

- An itinerary creation request is NEVER an attraction recommendation request.
- A request to generate a day-wise travel plan is NEVER a recommendation request.
- Do not classify every question about places as a recommendation request.
- Only return true when the user explicitly asks for attraction or activity suggestions.
- Use conversation history only to resolve references such as "that day".
- Do not invent a day number.
- When uncertain, return false.
- Return valid JSON only.

Conversation history:
${conversationHistory}

Latest user message:
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
        return {
          recommendationRequested: false,
          dayNumber: null,
        };
      }

      const parsed: unknown = JSON.parse(text);

      const schema = z.object({
        recommendationRequested: z.boolean(),
        dayNumber: z.number().int().positive().nullable(),
      });

      const result = schema.safeParse(parsed);

      if (!result.success) {
        return {
          recommendationRequested: false,
          dayNumber: null,
        };
      }

      return result.data;
    } catch (error) {
      console.error("Failed to detect attraction recommendation request:", error);

      return {
        recommendationRequested: false,
        dayNumber: null,
      };
    }
  }

  /**
   * extractModification
   *
   * @param {string} userMessage
   * @return {*}  {(Promise<PendingItineraryChange | null>)}
   * @memberof ItineraryIntentService
   */
  /**
   * Extract itinerary modifications using the user's message
   * and previously recommended attractions.
   *
   * @param userMessage
   * @param recommendedAttractions
   * @returns PendingItineraryChange
   */
  public async extractModification(
    userMessage: string,
    recommendedAttractions: RecommendedAttraction[] = [],
  ): Promise<PendingItineraryChange> {
    const prompt = `
You are TripNest's intelligent itinerary modification extractor.

Your task is to understand the user's requested changes to an existing
travel itinerary.

You must interpret the latest user message using the previously
recommended attractions.

==================================================
LATEST USER MESSAGE
==================================================

${JSON.stringify(userMessage)}

==================================================
PREVIOUSLY RECOMMENDED ATTRACTIONS
==================================================

${JSON.stringify(recommendedAttractions, null, 2)}

==================================================
TASK 1: UNDERSTAND THE USER'S INTENTION
==================================================

Identify whether the user wants to:

1. ADD a new attraction to the itinerary.
2. REMOVE an existing attraction.
3. REPLACE an existing attraction with another attraction.
4. MOVE an existing attraction from one day to another.

Extract only the changes explicitly requested by the user.

==================================================
TASK 2: RESOLVE INDIRECT ATTRACTION REFERENCES
==================================================

The user may refer to an attraction without mentioning its actual name.

Use the previously recommended attractions to understand these references.

Examples:

- Add the first one.
- Add the second one.
- Add that 2nd one.
- Add that 2 nd one.
- I want the third option.
- Add option number two.
- Let's include the last attraction.
- Add the attraction you mentioned second.
- I like the second suggestion.
- Add that place after Lakkidi Viewpoint.

You must understand these expressions semantically.

IMPORTANT RULES:

1. Resolve references using the previously recommended attractions.

2. The first recommendation is the first attraction in the array.

3. The second recommendation is the second attraction in the array.

4. The third recommendation is the third attraction in the array.

5. "Last one" refers to the last attraction in the array.

6. Preserve the exact attraction name from the recommendation list.

7. Do not interpret ordinal references as literal attraction names.

8. Do not invent attraction names.

9. If the user refers to an attraction that cannot be identified
   confidently, set referenceResolved to false.

10. If the user explicitly mentions an attraction by name,
    use that name directly.

==================================================
REFERENCE RESOLUTION EXAMPLE
==================================================

Previously recommended attractions:

[
  {
    "name": "Chain Tree",
    "reason": "Located near Lakkidi."
  },
  {
    "name": "Heart Shaped Lake (Chembra View)",
    "reason": "A scenic natural attraction."
  },
  {
    "name": "Thamarassery Churam Viewpoint",
    "reason": "Offers scenic mountain views."
  }
]

Latest user message:

"ADD THAT 2 ND ONE TO DAY 1 AFTER Lakkidi Viewpoint"

Expected interpretation:

{
  "addPlaces": [
    {
      "name": "Heart Shaped Lake (Chembra View)",
      "dayNumber": 1,
      "insertBefore": null,
      "insertAfter": "Lakkidi Viewpoint",
      "preferredTime": null
    }
  ],
  "removePlaces": [],
  "replacePlaces": [],
  "movePlaces": [],
  "description": "Add Heart Shaped Lake (Chembra View) to Day 1 after Lakkidi Viewpoint.",
  "referenceResolved": true
}

==================================================
TASK 3: EXTRACT ADDITIONS
==================================================

For every requested addition, extract:

- name: Exact attraction name.
- dayNumber: Explicitly specified day number, otherwise null.
- insertBefore: Existing attraction that the new attraction
  should appear immediately before, otherwise null.
- insertAfter: Existing attraction that the new attraction
  should appear immediately after, otherwise null.
- preferredTime: Requested visiting time, otherwise null.

Examples:

"Add Pookode Lake to Day 2."

dayNumber: 2
insertBefore: null
insertAfter: null
preferredTime: null

"Add Echo Point after Mattupetty Dam in the afternoon."

dayNumber: null
insertBefore: null
insertAfter: "Mattupetty Dam"
preferredTime: "Afternoon"

"Add Chembra View before Lakkidi Viewpoint on Day 1."

dayNumber: 1
insertBefore: "Lakkidi Viewpoint"
insertAfter: null
preferredTime: null

==================================================
TASK 4: EXTRACT REMOVALS
==================================================

For every requested removal, extract:

- name: Exact attraction to remove.
- dayNumber: Explicitly specified day number, otherwise null.

Do not invent a day number.

==================================================
TASK 5: EXTRACT REPLACEMENTS
==================================================

For every requested replacement, extract:

- remove: Existing attraction to replace.
- add: Replacement attraction.
- dayNumber: Explicitly specified day number, otherwise null.
- preferredTime: Requested visiting time, otherwise null.

Preserve the original attraction's position unless the user
explicitly requests a different position.

Do not interpret a simple addition as a replacement.

==================================================
TASK 6: EXTRACT MOVES
==================================================

For every requested move, extract:

- name: Exact existing attraction name.
- fromDayNumber: The current day number of the attraction.
- toDayNumber: The destination day number.
- insertBefore: Existing attraction before which the moved attraction
  should appear, otherwise null.
- insertAfter: Existing attraction after which the moved attraction
  should appear, otherwise null.

IMPORTANT RULES:

1. A move means transferring an existing attraction from one day
   to another day.

2. Do not interpret a move as an addition or removal.

3. Preserve the exact attraction name.

4. Extract both the source day and destination day when provided.

5. Do not invent day numbers.

6. If the user does not provide the source day number,
   use null only if the schema allows it. Otherwise, do not
   create a move and set referenceResolved to false.

7. If the user does not provide the destination day number,
   do not create a move and set referenceResolved to false.

8. If the user specifies a position in the destination day,
   extract it using insertBefore or insertAfter.

9. If no position is specified, use null for both fields.

10. Do not create a move if the user only asks to add an attraction.

==================================================
MOVE EXAMPLES
==================================================

Example 1:

User message:

"Move Edakkal Caves from Day 2 to Day 3."

Expected:

{
  "name": "Edakkal Caves",
  "fromDayNumber": 2,
  "toDayNumber": 3,
  "insertBefore": null,
  "insertAfter": null
}

Example 2:

User message:

"Move Pookode Lake from Day 2 to Day 1 after Lakkidi Viewpoint."

Expected:

{
  "name": "Pookode Lake",
  "fromDayNumber": 2,
  "toDayNumber": 1,
  "insertBefore": null,
  "insertAfter": "Lakkidi Viewpoint"
}

Example 3:

User message:

"Move Banasura Sagar Dam from Day 2 to Day 3 before Soochipara Waterfalls."

Expected:

{
  "name": "Banasura Sagar Dam",
  "fromDayNumber": 2,
  "toDayNumber": 3,
  "insertBefore": "Soochipara Waterfalls",
  "insertAfter": null
}

==================================================
TASK 7: DESCRIPTION
==================================================

Provide a concise description of all requested modifications.

==================================================
IMPORTANT EXTRACTION RULES
==================================================

- Extract only changes explicitly requested by the user.
- Use the recommended attractions to resolve indirect references.
- Preserve exact attraction names.
- Never use phrases such as "2 ND ONE", "second one",
  or "that attraction" as an attraction name when a reference
  can be resolved.
- Do not invent destinations.
- Do not invent day numbers.
- Do not invent insertion positions.
- Do not invent visiting times.
- Use null for unspecified optional values.
- Return all four arrays, even if they are empty.
- If an indirect reference cannot be resolved confidently,
  set referenceResolved to false.
- If there is no actual modification request, do not invent one.
- Return valid JSON only.

==================================================
REQUIRED JSON STRUCTURE
==================================================

{
  "addPlaces": [],
  "removePlaces": [],
  "replacePlaces": [],
  "movePlaces": [
    {
      "name": "Edakkal Caves",
      "fromDayNumber": 2,
      "toDayNumber": 3,
      "insertBefore": null,
      "insertAfter": null
    }
  ],
  "description": "Move Edakkal Caves from Day 2 to Day 3.",
  "referenceResolved": true
}

The example illustrates the expected structure only.

Extract the actual user's request.

Return JSON only without Markdown or explanations.
`;

    // STEP 1: Call Gemini to understand and extract modifications.

    const response = await this._ai.models.generateContent({
      model: this._model,
      contents: prompt,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            addPlaces: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: {
                    type: "STRING",
                  },
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
                  name: {
                    type: "STRING",
                  },
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
                  remove: {
                    type: "STRING",
                  },
                  add: {
                    type: "STRING",
                  },
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

            movePlaces: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: {
                    type: "STRING",
                  },
                  fromDayNumber: {
                    type: "INTEGER",
                  },
                  toDayNumber: {
                    type: "INTEGER",
                  },
                  insertBefore: {
                    type: "STRING",
                    nullable: true,
                  },
                  insertAfter: {
                    type: "STRING",
                    nullable: true,
                  },
                },
                required: ["name", "fromDayNumber", "toDayNumber", "insertBefore", "insertAfter"],
              },
            },

            description: {
              type: "STRING",
            },

            referenceResolved: {
              type: "BOOLEAN",
            },
          },

          required: [
            "addPlaces",
            "removePlaces",
            "replacePlaces",
            "movePlaces",
            "description",
            "referenceResolved",
          ],
        },
      },
    });

    // STEP 2: Validate Gemini's response.

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

      movePlaces: z.array(
        z.object({
          name: z.string().trim().min(1),
          fromDayNumber: z.number().int().positive(),
          toDayNumber: z.number().int().positive(),
          insertBefore: nullableString,
          insertAfter: nullableString,
        }),
      ),

      description: z.string(),

      referenceResolved: z.boolean(),
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

    console.log(
      "[Itinerary Modification] Gemini extraction result:",
      JSON.stringify(modification, null, 2),
    );

    // STEP 3: Stop if Gemini could not resolve an indirect reference.

    if (!modification.referenceResolved) {
      throw new Error("I couldn't identify the attraction you selected. Please mention its name.");
    }

    // STEP 4: Validate move operations.

    for (const move of modification.movePlaces) {
      if (move.fromDayNumber === move.toDayNumber) {
        throw new Error(`The source and destination days are the same for ${move.name}.`);
      }

      if (move.insertBefore && move.insertAfter) {
        throw new Error(
          `The move position for ${move.name} is ambiguous. Please specify either before or after another attraction.`,
        );
      }
    }

    // STEP 5: Validate that actual modifications were extracted.

    const hasChanges =
      modification.addPlaces.length > 0 ||
      modification.removePlaces.length > 0 ||
      modification.replacePlaces.length > 0 ||
      modification.movePlaces.length > 0;

    if (!hasChanges) {
      throw new Error("No valid itinerary modifications could be extracted from the request.");
    }

    // STEP 6: Return the validated modification.

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

      movePlaces: modification.movePlaces.map((place) => ({
        name: place.name,
        fromDayNumber: place.fromDayNumber,
        toDayNumber: place.toDayNumber,

        ...(place.insertBefore !== null ? { insertBefore: place.insertBefore } : {}),

        ...(place.insertAfter !== null ? { insertAfter: place.insertAfter } : {}),
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
