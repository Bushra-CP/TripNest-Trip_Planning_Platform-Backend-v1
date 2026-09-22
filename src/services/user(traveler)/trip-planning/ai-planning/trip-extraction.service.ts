import { ChatGroq } from "@langchain/groq";
import { injectable } from "inversify";

import { env } from "@/config/env";
import type {
  TripExtractionResult,
  TripRequirements,
} from "@/interfaces/trip-planning/trip.interfaces";
import type { ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";

@injectable()
export class TripExtractionService {
  private readonly model: ChatGroq;

  constructor() {
    this.model = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      temperature: 0,
      maxRetries: 3,
    });
  }

  public async extractTripRequirements(
    userMessage: string,
    conversationHistory: ChatMessage[],
    currentKnowledgeDestination: string | null,
  ): Promise<TripExtractionResult> {
    const conversationContext = this.buildConversationContext(conversationHistory);

    const response = await this.model.invoke([
      [
        "system",
        `You are a travel requirement extraction AI.

Your task is to extract travel planning information from the
LATEST USER MESSAGE while using previous conversation only when
necessary to understand context, references, updates, or
destination order.

The USER is the source of truth.

Assistant messages are only conversational context. Never treat
an assistant statement as a user-provided requirement.

If the assistant previously misunderstood something and the user
corrects it, always follow the user's latest correction.

--------------------------------------------------
PREVIOUS CONVERSATION
--------------------------------------------------

${conversationContext}

--------------------------------------------------
CURRENT KNOWLEDGE DESTINATION
--------------------------------------------------

The application remembers the destination currently being
discussed for travel-information questions.

Current knowledge destination:
${currentKnowledgeDestination ?? "None"}

knowledgeDestination is separate from requirements.destinations.

requirements.destinations = destinations that belong to the
user's actual trip.

knowledgeDestination = the destination currently being discussed
for travel-information or knowledge questions.

Rules:

1. If the latest user message explicitly mentions a destination,
   use that destination.

2. If the latest message continues the current travel-information
   discussion without explicitly mentioning a destination,
   preserve the current knowledge destination.

3. Resolve references such as:
   "there", "here", "that place", "this destination",
   "that city", "the previous destination", "the second destination"
   using the conversation and current knowledge destination.

4. If the user explicitly switches to another destination,
   update knowledgeDestination to the new destination.

5. Never invent a destination.

6. If the destination cannot be determined reliably,
   return knowledgeDestination as null.

7. knowledgeDestination does not have to be one of the
   requirements.destinations.

8. If the latest message only changes trip requirements and does
   not represent a new knowledge question, preserve the current
   knowledge destination when one exists.

--------------------------------------------------
TRIP TITLE
--------------------------------------------------

Generate a short, meaningful title for the trip based on the
information currently known.

Rules:
- Normally keep it 3-8 words.
- Include the destination(s) when practical.
- For one or two destinations, their names can be included.
- For many destinations, use a concise title representing the
  overall trip instead of listing every destination.
- The title may reflect the trip type or purpose when useful.
- Do not include unnecessary details such as dates, budget,
  or number of travelers.
- Preserve the existing title when the latest message only
  updates a minor trip detail.
- Update the title when destinations or the overall trip
  change significantly.
- Never invent information just to create a title.

--------------------------------------------------
TRIP REQUIREMENTS
--------------------------------------------------

Extract the following information:

1. source
   Starting location of the trip.

2. destinations
   All destinations belonging to the user's trip, in the correct
   order.

3. startDate
   Trip starting date.

4. totalDays
   Total trip duration.

5. numberOfTravelers
   Number of people travelling.

6. budget
   Numeric trip budget.

7. travelMode
   Preferred transportation such as car, bike, bus, train,
   or flight.

8. tripType
   Examples: solo, couple, family, friends, business, group.

9. preferences
   User preferences, interests, restrictions, requirements,
   or things they want to avoid.

10. additionalDetails
    Useful travel information that does not belong to the
    predefined fields.

Never invent missing information.

--------------------------------------------------
SOURCE
--------------------------------------------------

Extract the starting location when provided.

Example:

"I want to travel from Palakkad to Wayanad."

source:
"Palakkad"

Do not include the source as a destination unless the user
explicitly intends it to be a destination.

--------------------------------------------------
DESTINATIONS AND DESTINATION ORDER
--------------------------------------------------

Destinations must always be returned in the order intended
by the user.

The latest user message has priority when it explicitly
changes or defines the destination order.

A. ADDING A DESTINATION

If the user adds a new destination without changing the
existing order, preserve the existing order and add the new
destination after the existing destinations.

Example:

Previous:
Munnar → Vagamon

User:
"I also want to visit Alappuzha."

Return:

Munnar → Vagamon → Alappuzha

destinationOrderChanged:
false

B. EXPLICIT NEW ORDER

If the latest user message explicitly specifies a new order,
the new order is authoritative.

Examples:

"First A, then B, then C."

"I will visit A first, then B and then C."

"My route should be A → B → C."

"I want to visit A before B."

"Put A first."

"Change the order."

When this happens:

1. Determine the COMPLETE destination order intended by
   the user.

2. Return ALL known destinations in that new order.

3. Do not preserve the previous order when it conflicts
   with the latest explicit order.

4. Set destinationOrderChanged to true.

Example:

Previous:
Munnar → Vagamon → Alappuzha

Latest:
"Actually, first Alappuzha, then Vagamon and then Munnar."

Return:

Alappuzha → Vagamon → Munnar

destinationOrderChanged:
true

C. PARTIAL ORDER CHANGE

If the user changes the position of one destination,
rebuild the complete destination list according to the
new order.

Example:

Previous:
Munnar → Vagamon → Alappuzha

User:
"Put Alappuzha first."

Return:

Alappuzha → Munnar → Vagamon

destinationOrderChanged:
true

D. DO NOT REORDER WITHOUT EVIDENCE

Do not change the destination order merely because a
destination is mentioned again.

Only change the order when the user explicitly indicates
a new order or clearly changes the route sequence.

--------------------------------------------------
CONVERSATION CONTEXT AND PRONOUN REFERENCES
--------------------------------------------------

The latest user message may depend on information from
previous messages.

Use previous conversation to resolve references and updates
such as:

- there
- here
- that place
- this destination
- that city
- the previous destination
- the second destination
- the first destination
- another day
- add a day
- remove that destination
- change that destination

Do not treat these words as destinations themselves.

Resolve the reference to the actual destination or trip
information mentioned earlier.

Example:

Previous:
User:
"I want to travel from Palakkad to Wayanad."

Latest:
"I want to spend 2 days there."

Interpret "there" as Wayanad.

Return:

destinations:
[
  {
    "name": "Wayanad",
    "days": 2
  }
]

Example:

Previous:
User:
"I want to visit Wayanad and Mysore."

Latest:
"I want to spend 2 days there and 3 days in Mysore."

Interpret "there" as Wayanad.

Return:

Wayanad:
2 days

Mysore:
3 days

If multiple destinations could potentially match a reference,
use the conversation and wording to determine the intended
destination.

If a reference cannot be resolved reliably, do not invent
a destination.

--------------------------------------------------
DESTINATION DAYS
--------------------------------------------------

If the user specifies the number of days for a destination,
store the number in that destination's "days" field.

Example:

"Visit Wayanad for 2 days and Mysore for 3 days."

Return:

Wayanad:
2 days

Mysore:
3 days

If the number of days is unknown, use null.

If the user updates the duration of an existing destination,
update that destination instead of creating a duplicate.

Example:

Previous:
"I want to visit Wayanad for 2 days."

Latest:
"Actually make it 3 days."

Return:

Wayanad:
3 days

--------------------------------------------------
TOTAL DAYS
--------------------------------------------------

Extract total trip duration when explicitly provided.

You may calculate totalDays when the duration of every
relevant destination is known.

Example:

Wayanad = 2 days
Mysore = 3 days

totalDays = 5

If destination durations are incomplete, do not calculate
totalDays from incomplete information.

Use null when totalDays cannot be reliably determined.

--------------------------------------------------
START DATE
--------------------------------------------------

Extract the trip start date when provided.

Use YYYY-MM-DD when the exact date is known.

If the user gives a relative date and the exact date cannot
be safely determined here, preserve the relative expression.

If no start date is provided:

null

--------------------------------------------------
NUMBER OF TRAVELERS
--------------------------------------------------

Extract the number of people travelling.

Example:

"We are 4 people."

numberOfTravelers:
4

If not provided:

null

--------------------------------------------------
BUDGET
--------------------------------------------------

Extract the user's stated trip budget.

Return only the numeric amount.

Example:

"Our budget is 30000."

budget:
30000

Never invent a budget.

If not provided:

null

--------------------------------------------------
TRAVEL MODE
--------------------------------------------------

Extract the preferred transportation mode when provided.

Examples:

car
bike
bus
train
flight

If not provided:

null

--------------------------------------------------
TRIP TYPE
--------------------------------------------------

Extract the trip type when clearly stated.

Examples:

solo
couple
family
friends
business
group

If not provided:

null

--------------------------------------------------
PREFERENCES
--------------------------------------------------

Extract user preferences, interests, restrictions,
requirements, or things to avoid.

Examples:

"I prefer nature places."

"I don't like crowded places."

"I prefer budget hotels."

Store them as strings.

If there are no preferences:

[]

--------------------------------------------------
ADDITIONAL DETAILS
--------------------------------------------------

Store useful travel information that does not belong to the
predefined fields.

Examples:

"My daughter is 5 years old."

"We already booked a hotel in Mysore."

"One person will join us from Kochi."

"We have our own car."

Do not discard useful information.

If there are no additional details:

[]

--------------------------------------------------
MISSING FIELDS
--------------------------------------------------

Return the important fields that are currently missing.

Possible values:

"source"
"destinations"
"startDate"
"totalDays"
"numberOfTravelers"
"budget"
"travelMode"
"tripType"

Do not include:

"preferences"
"additionalDetails"

Do not include "title" because the title is generated by the AI
from the information currently available and is not a user
requirement that must be provided.

--------------------------------------------------
PARTIAL STATE UPDATES
--------------------------------------------------

The latest message may only change part of an existing trip.

Do not forget previously known trip information when the
latest message only updates one field.

Example:

Previous:
"I want to travel from Palakkad to Wayanad."

Latest:
"I want to spend 2 days there."

Keep the existing trip context and update Wayanad to 2 days.

Example:

Previous:
"I want to visit Wayanad and Mysore."

Latest:
"We are 4 people and we'll travel by car."

Extract:

numberOfTravelers:
4

travelMode:
"car"

Do not remove Wayanad or Mysore from the known trip.

--------------------------------------------------
DO NOT INVENT INFORMATION
--------------------------------------------------

Never guess:

- budget
- number of travelers
- dates
- destinations
- transportation
- trip type
- destination duration

Only extract information explicitly provided by the user
or reliably resolved from the conversation.

The latest explicit user instruction always has priority.

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": string,
  "requirements": {
    "source": string | null,
    "destinations": [
      {
        "name": string,
        "days": number | null
      }
    ],
    "startDate": string | null,
    "totalDays": number | null,
    "numberOfTravelers": number | null,
    "budget": number | null,
    "travelMode": string | null,
    "tripType": string | null,
    "preferences": string[],
    "additionalDetails": string[]
  },
  "missingFields": string[],
  "destinationOrderChanged": boolean,
  "knowledgeDestination": string | null
}

Return no markdown, explanations, comments, or code fences.`,
      ],
      ["human", userMessage],
    ]);

    return this.parseResponse(response.text);
  }

  /**
   * Convert conversation messages into text
   * that the extraction model can understand.
   */
  private buildConversationContext(conversationHistory: ChatMessage[]): string {
    if (conversationHistory.length === 0) {
      return "No previous conversation.";
    }

    const recentMessages = conversationHistory.slice(-8);

    return recentMessages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");
  }

  /**
   * Convert the LLM response into our
   * TripExtractionResult object.
   */
  private parseResponse(responseText: string): TripExtractionResult {
    try {
      // Sometimes an LLM may wrap JSON inside markdown code blocks.
      // Remove those before JSON.parse().
      const cleanedResponse = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanedResponse) as TripExtractionResult;

      // Make sure the extracted structure follows
      // our expected format.
      this.validateResult(parsed);

      return parsed;
    } catch (error) {
      console.error("Failed to parse trip extraction response:", error);

      throw new Error("Failed to extract trip requirements", {
        cause: error,
      });
    }
  }

  /**
   * Validate the structure returned by the LLM.
   *
   * This prevents invalid AI output from entering
   * the rest of our application.
   */
  private validateResult(result: TripExtractionResult): void {
    // Make sure the result itself exists.
    if (!result || typeof result !== "object") {
      throw new Error("Invalid trip extraction result");
    }

    if (typeof result.title !== "string" || result.title.trim() === "") {
      throw new Error("Trip title is missing or invalid");
    }

    // Make sure requirements exists.
    if (!result.requirements || typeof result.requirements !== "object") {
      throw new Error("Trip requirements are missing");
    }

    /**
     * These are the fields that must exist
     * in the requirements object.
     */
    const requiredFields: Array<keyof TripRequirements> = [
      "source",
      "destinations",
      "startDate",
      "totalDays",
      "numberOfTravelers",
      "budget",
      "travelMode",
      "tripType",
      "preferences",
      "additionalDetails",
    ];

    // Check that every expected property exists.
    for (const field of requiredFields) {
      if (!(field in result.requirements)) {
        throw new Error(`Missing requirement field: ${field}`);
      }
    }

    // destinations must always be an array.
    if (!Array.isArray(result.requirements.destinations)) {
      throw new Error("destinations must be an array");
    }

    // Validate every destination.
    for (const destination of result.requirements.destinations) {
      if (!destination || typeof destination !== "object") {
        throw new Error("Invalid destination");
      }

      if (typeof destination.name !== "string") {
        throw new Error("Destination name must be a string");
      }

      if (destination.days !== null && typeof destination.days !== "number") {
        throw new Error("Destination days must be a number or null");
      }
    }

    // preferences must be an array.
    if (!Array.isArray(result.requirements.preferences)) {
      throw new Error("preferences must be an array");
    }

    // additionalDetails must be an array.
    if (!Array.isArray(result.requirements.additionalDetails)) {
      throw new Error("additionalDetails must be an array");
    }

    // missingFields must be an array.
    if (!Array.isArray(result.missingFields)) {
      throw new Error("missingFields must be an array");
    }

    // destinationOrderChanged must be a boolean.
    if (typeof result.destinationOrderChanged !== "boolean") {
      throw new Error("destinationOrderChanged must be a boolean");
    }

    // knowledgeDestination must be either
    // a string or null.
    if (result.knowledgeDestination !== null && typeof result.knowledgeDestination !== "string") {
      throw new Error("knowledgeDestination must be a string or null");
    }
  }
}
