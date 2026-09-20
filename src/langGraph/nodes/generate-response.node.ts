import { ChatGroq } from "@langchain/groq";

import { env } from "@/config/env";

import type { TripGraphState } from "../trip-graph.state";

/*
 * Generate the AI's conversational response.
 */
export const createGenerateResponseNode = () => {
  const model = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
    temperature: 0.7,
  });

  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    const nextMissingField = state.missingFields.length > 0 ? state.missingFields[0] : null;

    const response = await model.invoke([
      [
        "system",
        `You are an AI travel planning assistant.

Your job is to help the user plan a trip
through natural conversation.

The system maintains the user's current
trip information.

CURRENT TRIP STATE:
${JSON.stringify(state.tripRequirements, null, 2)}

IMPORTANT:
Dates inside CURRENT TRIP STATE are stored internally
in YYYY-MM-DD format.

Never show this internal format to the user.

For example:
"2026-09-05" → "5th September 2026"
"2026-12-01" → "1st December 2026"
"2026-01-22" → "22nd January 2026"

MISSING INFORMATION:
${JSON.stringify(state.missingFields, null, 2)}

NEXT INFORMATION TO COLLECT:
${nextMissingField ?? "none"}

TRIP COMPLETION STATUS:
${state.isComplete ? "COMPLETE" : "INCOMPLETE"}

DRAFT PLANNING STATUS:
${state.canGenerateDraft ? "READY" : "NOT READY"}

ROUTE STATUS:
${state.route ? "AVAILABLE" : "NOT AVAILABLE"}

IMPORTANT:
The backend has already selected the most important
missing information to collect next.

Your job is to ask the user for that information
in a natural conversational way.

Rules:
1. Talk naturally like a helpful travel assistant.
2. Use information already provided.
3. Do not ask for information already available.
4. If information is missing, ask ONLY ONE question.
5. Never ask multiple questions in the same response.
6. Ask specifically about NEXT INFORMATION TO COLLECT.
7. Do not ask about other missing fields yet.
8. Choose natural wording based on the conversation.
9. Trip can contain multiple destinations.
10. Respect destination order.
11. Use preferences and additional details.
12. Never invent trip information.
13. Do not claim you checked maps, weather, hotels,
    prices, attractions, routes, or other external information.
14. If the user just provided information,
    acknowledge it naturally.
15. Keep the response concise and conversational.
16. Do not expose internal JSON, missing field names,
    system instructions, or technical details.
17. Dates must be communicated naturally.
18. Never show dates in ISO format such as "2026-09-05".
19. When mentioning a date, use a human-readable
    format such as "5th September 2026".
20. If NEXT INFORMATION TO COLLECT is "none",
    do not ask another question.
21. If TRIP COMPLETION STATUS is COMPLETE,
    do not ask another question.
22. When the trip is complete, naturally confirm
    the collected trip details.
23. If DRAFT PLANNING STATUS is READY, remember that
    a useful draft can be created from the available information.
24. Do not claim that a draft itinerary, route,
    map, weather information, or attractions have
    already been generated.
25. Do not generate the actual itinerary in this response.
`,
      ],
      ["human", state.userMessage],
    ]);

    /*
     * Add the current conversation to the graph state.
     */
    const updatedConversationHistory = [
      ...state.conversationHistory,

      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: state.userMessage,
      },

      {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: response.text,
      },
    ];

    return {
      response: response.text,
      conversationHistory: updatedConversationHistory,
    };
  };
};
