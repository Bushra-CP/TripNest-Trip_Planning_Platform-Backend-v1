import { env } from "@/config/env";
import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";

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
