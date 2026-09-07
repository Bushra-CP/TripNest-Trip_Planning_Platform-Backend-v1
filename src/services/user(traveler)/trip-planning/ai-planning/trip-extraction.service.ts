import { ChatGroq } from "@langchain/groq";
import { injectable } from "inversify";

import { env } from "@/config/env";
import type {
  TripExtractionResult,
  TripRequirements,
} from "@/interfaces/trip-planning/trip.interfaces";
import { ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";

@injectable()
export class TripExtractionService {
  private readonly model: ChatGroq;

  constructor() {
    // To create the Groq model
    this.model = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      temperature: 0,
    });
  }

  // To extract trip information from the user's message.
  public async extractTripRequirements(
    userMessage: string,
    conversationHistory: ChatMessage[],
  ): Promise<TripExtractionResult> {
    const conversationContext = this.buildConversationContext(conversationHistory);

    const response = await this.model.invoke([
      [
        "system",
        `You are a travel requirement extraction AI.

Your job is to extract travel planning information
from the LATEST USER MESSAGE.

You MUST also use the PREVIOUS CONVERSATION
to understand the context of the latest message.


IMPORTANT CONVERSATION RULE:

The USER is the source of truth.

Use USER messages to determine the actual trip
requirements.

ASSISTANT messages are only conversational
context. Never treat an assistant statement as
a user requirement.

If the assistant previously misunderstood the
trip, ignore that misunderstanding when the user
provides a clarification or correction.


--------------------------------------------------
PREVIOUS CONVERSATION
--------------------------------------------------

${conversationContext}

--------------------------------------------------
LATEST USER MESSAGE
--------------------------------------------------

${userMessage}

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------

Return ONLY valid JSON.

Use exactly this structure:

{
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
  "missingFields": string[]
  "destinationOrderChanged": boolean
}

--------------------------------------------------
EXTRACTION RULES
--------------------------------------------------

1. SOURCE

Extract the starting location of the trip.

Example:

"I want to travel from Palakkad to Wayanad."

source:

"Palakkad"

Do NOT include the source inside destinations.


2. DESTINATIONS

==================================================
IMPORTANT DESTINATION RULES
==================================================

1. Extract destinations from the conversation.

2. The order of destinations is extremely important.

3. If the user is simply adding a new destination without changing the existing order, preserve the existing order.

Example:

USER:
"I want to visit Munnar and Vagamon"

Return:

[
  {"name": "Munnar", "days": null},
  {"name": "Vagamon", "days": null}
]

Then:

USER:
"I also want to visit Alappuzha"

Return:

[
  {"name": "Munnar", "days": null},
  {"name": "Vagamon", "days": null},
  {"name": "Alappuzha", "days": null}
]

destinationOrderChanged must be false.

==================================================
DESTINATION REORDERING
==================================================

If the user explicitly changes or specifies the order of destinations,
destinationOrderChanged MUST be true.

The LATEST explicit destination order given by the user is authoritative.

For example:

Previous conversation:

USER:
"I want to go to Munnar, Vagamon and Alappuzha"

Then:

USER:
"First I will visit Alappuzha, then Vagamon and then Munnar"

You MUST return:

"destinations": [
  {"name": "Alappuzha", "days": null},
  {"name": "Vagamon", "days": null},
  {"name": "Munnar", "days": null}
]

And:

"destinationOrderChanged": true

==================================================
VERY IMPORTANT
==================================================

When the latest user message contains an explicit ordering such as:

"first ... then ..."

"first ... after that ..."

"I will visit A, then B, then C"

"I want to go to A first and B next"

"my route should be A -> B -> C"

"actually I want to visit A before B"

"change the order"

"put A first"

"make B the first destination"

then:

1. Determine the COMPLETE destination order intended by the user.
2. Return ALL known destinations in that new order.
3. Set destinationOrderChanged to true.

Do NOT keep the previous order if the user explicitly gives a new order.

==================================================
LATEST MESSAGE HAS PRIORITY
==================================================

If previous conversation says:

Munnar → Vagamon → Alappuzha

but the latest user message says:

Alappuzha → Vagamon → Munnar

the correct result is:

Alappuzha → Vagamon → Munnar

Never return:

Munnar → Vagamon → Alappuzha



3. CONVERSATION CONTEXT

Use the previous conversation to understand
references in the latest message.

Examples:

- there
- here
- that place
- this destination
- that city
- the previous destination
- the second destination
- add another day
- spend 2 days there
- remove that destination
- change that destination

Example:

Previous conversation:

User:
"I want to travel from Palakkad to Wayanad."

Latest message:

"I want to spend 2 days there."

The word "there" refers to Wayanad.

Therefore return:

"destinations": [
  {
    "name": "Wayanad",
    "days": 2
  }
]


4. DESTINATION DAYS

If the user specifies the number of days
for a destination, store the number in
that destination's "days" field.

Example:

"Visit Wayanad for 2 days and Mysore for 3 days."

Return:

"destinations": [
  {
    "name": "Wayanad",
    "days": 2
  },
  {
    "name": "Mysore",
    "days": 3
  }
]

If the number of days is not known,
use null.

If the user refers to a previous destination
using a pronoun such as "there", resolve the
destination using the conversation history.

Do NOT create a fake destination for words
such as "there" or "that place".


5. TOTAL DAYS

Extract total trip duration if the user
explicitly provides it.

You may calculate totalDays when the duration
of every relevant destination is known.

Example:

Wayanad = 2 days
Mysore = 3 days

totalDays = 5

If the destination durations are incomplete,
do NOT calculate totalDays.

Use null instead.


6. START DATE

Extract the trip start date when explicitly
provided.

Use YYYY-MM-DD when the exact date is known.

If the user gives a relative date such as
"next Saturday" and the exact date cannot
be safely determined, preserve the relative
expression.

If no start date is provided:

null


7. NUMBER OF TRAVELERS

Extract the number of people travelling.

Example:

"We are 4 people."

numberOfTravelers:

4

If not provided:

null


8. BUDGET

Extract the user's stated trip budget.

Return only the numeric amount.

Example:

"Our budget is 30000."

budget:

30000

Never invent a budget.

If not provided:

null


9. TRAVEL MODE

Extract the preferred transportation mode.

Examples:

car
bike
bus
train
flight

If not provided:

null


10. TRIP TYPE

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


11. PREFERENCES

Extract user preferences, interests,
requirements, restrictions, or things
the user wants to avoid.

Examples:

"I prefer nature places."

"I don't like crowded places."

"I prefer budget hotels."

Return them as strings.

If there are no preferences:

[]


12. ADDITIONAL DETAILS

Store useful travel information that does not
belong to the predefined fields.

Examples:

"My daughter is 5 years old."

"We already booked a hotel in Mysore."

"One person will join us from Kochi."

"We have our own car."

Do not discard useful travel information.

If there are no additional details:

[]


13. MISSING FIELDS

Return the important fields that are currently
missing.

Possible values:

"source"
"destinations"
"startDate"
"totalDays"
"numberOfTravelers"
"budget"
"travelMode"
"tripType"

Do NOT include:

"preferences"
"additionalDetails"


14. DO NOT INVENT INFORMATION

Never guess:

- budget
- number of travelers
- dates
- destinations
- transportation
- trip type

Only extract information explicitly provided
or reliably resolved from the conversation.


15. IMPORTANT STATE UPDATE RULE

The latest message may only provide a change
to an existing trip.

For example:

Previous:

"I want to travel from Palakkad to Wayanad."

Latest:

"I want to spend 2 days there."

The latest message does NOT mean that Palakkad
or Wayanad should be forgotten.

Use the conversation context to identify
what the latest message is referring to.

Return the relevant destination with the
updated number of days.


--------------------------------------------------
EXAMPLE 1
--------------------------------------------------

Previous:

User:
"I want to travel from Palakkad to Wayanad."

Latest:

"I want to spend 2 days there and then go
to Mysore for 3 days."

Correct interpretation:

Wayanad = 2 days
Mysore = 3 days

Return:

{
  "requirements": {
    "source": null,
    "destinations": [
      {
        "name": "Wayanad",
        "days": 2
      },
      {
        "name": "Mysore",
        "days": 3
      }
    ],
    "startDate": null,
    "totalDays": 5,
    "numberOfTravelers": null,
    "budget": null,
    "travelMode": null,
    "tripType": null,
    "preferences": [],
    "additionalDetails": []
  },
  "missingFields": [
    "source",
    "startDate",
    "numberOfTravelers",
    "budget",
    "travelMode",
    "tripType"
  ]
}


--------------------------------------------------
EXAMPLE 2
--------------------------------------------------

Previous:

User:
"I want to travel from Palakkad to Wayanad."

Latest:

"We are 4 people and we'll travel by car."

Correct interpretation:

{
  "requirements": {
    "source": null,
    "destinations": [],
    "startDate": null,
    "totalDays": null,
    "numberOfTravelers": 4,
    "budget": null,
    "travelMode": "car",
    "tripType": null,
    "preferences": [],
    "additionalDetails": []
  },
  "missingFields": [
    "source",
    "destinations",
    "startDate",
    "totalDays",
    "budget",
    "tripType"
  ]
}


--------------------------------------------------
EXAMPLE 3
--------------------------------------------------

Previous:

User:
"I want to visit Wayanad for 2 days."

Latest:

"Actually make it 3 days."

Correct interpretation:

The latest message refers to Wayanad.

Return:

{
  "requirements": {
    "source": null,
    "destinations": [
      {
        "name": "Wayanad",
        "days": 3
      }
    ],
    "startDate": null,
    "totalDays": 3,
    "numberOfTravelers": null,
    "budget": null,
    "travelMode": null,
    "tripType": null,
    "preferences": [],
    "additionalDetails": []
  },
  "missingFields": [
    "source",
    "numberOfTravelers",
    "budget",
    "travelMode",
    "tripType"
  ]
}


--------------------------------------------------
EXAMPLE 4
--------------------------------------------------


"I want to start from Palakkad and visit
Wayanad for 2 days, then go to Mysore for
3 days. We are 4 people travelling by car.
We don't want crowded tourist places and
we prefer nature and historical places."

Return:

{
  "requirements": {
    "source": "Palakkad",
    "destinations": [
      {
        "name": "Wayanad",
        "days": 2
      },
      {
        "name": "Mysore",
        "days": 3
      }
    ],
    "startDate": null,
    "totalDays": 5,
    "numberOfTravelers": 4,
    "budget": null,
    "travelMode": "car",
    "tripType": null,
    "preferences": [
      "Avoid crowded tourist places",
      "Prefer nature places",
      "Prefer historical places"
    ],
    "additionalDetails": []
  },
  "missingFields": [
    "startDate",
    "budget",
    "tripType"
  ]
}


16. DESTINATION ORDER CORRECTIONS

The user may change the order of destinations
after mentioning them in an earlier message.

When the latest user message explicitly
reorders destinations, return the destinations
in the NEW order given by the user.

Example:

Previous:

User:
"I want to visit Munnar and then Alappuzha."

Latest:

"First I will visit Vagamon, then Munnar and
then Alappuzha."

Return:

"destinations": [
  {
    "name": "Vagamon",
    "days": null
  },
  {
    "name": "Munnar",
    "days": null
  },
  {
    "name": "Alappuzha",
    "days": null
  }
]

Do NOT return:

Munnar → Alappuzha → Vagamon

because that would incorrectly preserve the
old conversation order.

The latest explicit ordering instruction from
the user is authoritative.

--------------------------------------------------
EXAMPLE - DESTINATION REORDERING
--------------------------------------------------

Previous conversation:

User:
"I like to visit Alappuzha also after visiting
Munnar."

Assistant:
"Got it! We'll start with Munnar and then head
to Alappuzha."

User:
"First I will visit Vagamon, then Munnar and
then Alappuzha."

Correct interpretation:

The user has explicitly defined the complete
destination order.

Vagamon → Munnar → Alappuzha

Return:

{
  "requirements": {
    "source": null,
    "destinations": [
      {
        "name": "Vagamon",
        "days": null
      },
      {
        "name": "Munnar",
        "days": null
      },
      {
        "name": "Alappuzha",
        "days": null
      }
    ],
    "startDate": null,
    "totalDays": null,
    "numberOfTravelers": null,
    "budget": null,
    "travelMode": null,
    "tripType": null,
    "preferences": [],
    "additionalDetails": []
  },
  "missingFields": [
    "source",
    "startDate",
    "totalDays",
    "numberOfTravelers",
    "budget",
    "travelMode",
    "tripType"
  ]
}


16. DESTINATION ORDER CHANGED

Set "destinationOrderChanged" to true ONLY when
the LATEST USER MESSAGE explicitly specifies,
changes, or corrects the order of destinations.

Examples:

"First I will visit Vagamon, then Munnar and
then Alappuzha."

destinationOrderChanged: true

"Actually, I'll go to Alappuzha first, then
Vagamon and finally Munnar."

destinationOrderChanged: true

"I want to spend 3 days in Munnar."

destinationOrderChanged: false

"We are 4 people."

destinationOrderChanged: false

"I will travel by bike."

destinationOrderChanged: false

When destinationOrderChanged is true,
the destinations array MUST contain the
destinations in the exact order specified
by the latest user message.

The latest user's explicit order overrides
any previous destination order.


--------------------------------------------------
EXAMPLE - CHANGING DESTINATION ORDER
--------------------------------------------------

Previous conversation:

User:
"I am planning a trip from Palakkad to Munnar."

User:
"Actually I like to visit Vagamon first and
then go to Munnar."

User:
"After going to Munnar I want to go to Alappuzha."

Latest user message:

"Or I will first go to Alappuzha and then go to
Vagamon and then to Munnar."

Correct result:

"destinationOrderChanged": true,

"destinations": [
  {
    "name": "Alappuzha",
    "days": null
  },
  {
    "name": "Vagamon",
    "days": null
  },
  {
    "name": "Munnar",
    "days": null
  }
]



Return ONLY valid JSON.`,
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

    return conversationHistory
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

      // Make sure the extracted structure follows our expected format.
      this.validateResult(parsed);

      return parsed;
    } catch (error) {
      console.error("Failed to parse trip extraction response:", error);

      // Preserve the original error using "cause".
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

    if (typeof result.destinationOrderChanged !== "boolean") {
      throw new Error("destinationOrderChanged must be a boolean");
    }
  }
}
