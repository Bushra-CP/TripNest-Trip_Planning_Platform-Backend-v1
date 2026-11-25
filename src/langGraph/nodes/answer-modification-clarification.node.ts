import { GoogleGenAI } from "@google/genai";

import { env } from "@/config/env";

import type { TripGraphState } from "../trip-graph.state";
import type { ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";

export const createAnswerModificationClarificationNode = () => {
  const ai = new GoogleGenAI({
    apiKey: env.GOOGLE_API_KEY4,
  });

  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    console.log("\n========== ANSWER MODIFICATION CLARIFICATION ==========");

    console.log("CLARIFICATION CONTEXT:", {
      userMessage: state.userMessage,
      pendingItineraryChange: state.pendingItineraryChange,
      feasibilityStatus: state.modificationFeasibility?.status,
      proposedDays: state.proposedItineraryDays.length,
      affectedDayNumbers: state.affectedDayNumbers,
    });

    // Convert the proposed itinerary into readable context.
    const proposedItinerary = state.proposedItineraryDays
      .map((day) => {
        const stops = day.stops
          .map((stop, index) => {
            return [
              `${index + 1}. ${stop.name}`,
              `Description: ${stop.description}`,
              `Start time: ${stop.startTime ?? "Not specified"}`,
              `Duration: ${
                stop.durationMinutes !== undefined
                  ? `${stop.durationMinutes} minutes`
                  : "Not specified"
              }`,
              `Location: ${stop.location ?? "Not specified"}`,
            ].join("\n");
          })
          .join("\n\n");

        return [
          `Day ${day.dayNumber}: ${day.title}`,
          `Description: ${day.description}`,
          "Stops:",
          stops || "No stops available.",
        ].join("\n");
      })
      .join("\n\n");

    const feasibility = state.modificationFeasibility;

    const feasibilityContext = feasibility
      ? JSON.stringify(
          {
            status: feasibility.status,
            summary: feasibility.summary,
            concerns: feasibility.concerns,
            proposedChanges: feasibility.proposedChanges,
            requiresAdditionalDays: feasibility.requiresAdditionalDays,
          },
          null,
          2,
        )
      : "No feasibility assessment is available.";

    const modificationContext = state.pendingItineraryChange
      ? JSON.stringify(state.pendingItineraryChange, null, 2)
      : "No pending modification is available.";

    const prompt = `
You are TripNest's itinerary modification clarification assistant.

The user has received a proposed modification to their existing itinerary.
They are asking a question about that proposal before deciding whether
to apply it.

Your responsibility is to explain the proposed modification clearly
using only the information provided below.

==================================================
PENDING MODIFICATION
==================================================

${modificationContext}

==================================================
PROPOSED ITINERARY
==================================================

${proposedItinerary}

==================================================
FEASIBILITY ASSESSMENT
==================================================

${feasibilityContext}

==================================================
ANSWERING RULES
==================================================

1. Focus on the user's latest question.

2. Use the proposed itinerary and feasibility assessment
   as your primary sources of information.

3. Explain relevant proposed changes when necessary.

4. If the user asks about scheduling, use the proposed
   start times and activity durations when available.

5. If the user asks about travel time, use only travel
   information explicitly supported by the feasibility
   assessment or provided itinerary context.

6. Do not invent travel times, distances, opening hours,
   prices, weather conditions, or other travel facts.

7. If the available information does not answer the question,
   clearly explain that the information is not available.

8. Explain feasibility concerns honestly.
   Do not hide or minimize identified concerns.

9. Do not claim that the proposed changes have been saved
   or applied.

10. The original saved itinerary remains unchanged until
    the user explicitly confirms the proposed modification.

11. Do not generate a new itinerary.

12. Do not change the proposed itinerary.

13. Do not ask the user to repeat information that is
    already available in the provided context.

14. Keep your answer concise, natural, and conversational.

==================================================
FINAL RESPONSE
==================================================

Answer the user's question directly.

After answering, if appropriate, remind the user that
they can confirm the proposed changes when they are ready.

Do not automatically treat a clarification question
as confirmation or rejection.

The user's question is:

${state.userMessage}
`;

    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim();

    if (!responseText) {
      throw new Error("Gemini returned an empty itinerary modification clarification response.");
    }

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: responseText,
    };

    const updatedConversationHistory = [
      ...state.conversationHistory,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: state.userMessage,
      },
      assistantMessage,
    ];

    console.log("MODIFICATION CLARIFICATION ANSWER:", responseText);

    return {
      response: responseText,
      conversationHistory: updatedConversationHistory,

      // Reset the flag after answering.
      modificationClarificationRequested: false,

      // Keep the modification pending.
      itineraryRequested: true,
      itineraryAction: "MODIFY",
      confirmationStatus: "PENDING",

      // Preserve the exact proposal and feasibility assessment.
      pendingItineraryChange: state.pendingItineraryChange,
      modificationFeasibility: state.modificationFeasibility,
      proposedItineraryDays: state.proposedItineraryDays,
      affectedDayNumbers: state.affectedDayNumbers,
    };
  };
};
