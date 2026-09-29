import { injectable } from "inversify";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";

export const KNOWLEDGE_METADATA_FIELDS = [
  "places",
  "attractions",
  "activities",
  "accommodation",
  "restaurants",
  "cuisine",
  "transportation",
  "events",
  "festivals",
  "weather",
  "bestTimeToVisit",
  "travelTips",
  "safety",
  "budget",
  "topics",
] as const;

export type KnowledgeMetadataField = (typeof KNOWLEDGE_METADATA_FIELDS)[number];

export type KnowledgeMetadataFieldOrNull = KnowledgeMetadataField | null;

interface KnowledgeQueryClassification {
  metadataField: KnowledgeMetadataFieldOrNull;
}

@injectable()
export class KnowledgeQueryClassifierService {
  private readonly _ai: GoogleGenAI;
  private readonly _model: string;

  constructor() {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY,
    });

    this._model = env.GEMINI_MODEL;
  }

  public async classify(userMessage: string): Promise<KnowledgeMetadataFieldOrNull> {
    const prompt = `
You are a query classifier for a travel knowledge base.

Analyze the user's travel question and determine which ONE
knowledge metadata field is most relevant.

Allowed metadata fields:

${KNOWLEDGE_METADATA_FIELDS.join(", ")}

Rules:

- places = locations, cities, regions, landmarks as places
- attractions = tourist attractions, heritage sites, monuments
- activities = things to do or experiences
- accommodation = hotels, resorts, places to stay
- restaurants = restaurants or places to eat
- cuisine = food, dishes, meals, cuisine, food visible in images
- transportation = buses, trains, cars, flights, transport
- events = events or happenings
- festivals = festivals or celebrations
- weather = weather or climate
- bestTimeToVisit = when to visit
- travelTips = general travel advice
- safety = safety-related information
- budget = costs, expenses, prices, budget
- topics = general travel topics that do not fit another field

Return null if none of these fields is specifically relevant.

Examples:

User:
"What food is visible in this photo?"

Output:
{"metadataField":"cuisine"}

User:
"What heritage attraction is shown in this image?"

Output:
{"metadataField":"attractions"}

User:
"What can I do in Wayanad?"

Output:
{"metadataField":"activities"}

User:
"Where can I stay in Udaipur?"

Output:
{"metadataField":"accommodation"}

User:
"How much will this trip cost?"

Output:
{"metadataField":"budget"}

User:
"${userMessage}"

Return ONLY valid JSON.
`;

    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await this._ai.models.generateContent({
          model: this._model,
          contents: prompt,
        });

        break;
      } catch (error) {
        const status = (error as { status?: number }).status;

        if ((status === 503 || status === 429) && attempt < 3) {
          const delay = attempt * 2000;

          console.log(`Gemini request failed with ${status}. Retrying in ${delay}ms...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error("Gemini request failed after retries");
    }

    let text = response.text?.trim();

    if (!text) {
      return null;
    }

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(text) as KnowledgeQueryClassification;

      if (
        parsed.metadataField === null ||
        KNOWLEDGE_METADATA_FIELDS.includes(
          parsed.metadataField as (typeof KNOWLEDGE_METADATA_FIELDS)[number],
        )
      ) {
        return parsed.metadataField;
      }

      return null;
    } catch (error) {
      console.error("Failed to parse knowledge query classification:", error);

      return null;
    }
  }
}
