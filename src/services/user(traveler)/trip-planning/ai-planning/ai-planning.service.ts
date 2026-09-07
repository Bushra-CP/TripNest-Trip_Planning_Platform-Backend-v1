import { ChatGroq } from "@langchain/groq";
import { env } from "@/config/env";
import { inject, injectable } from "inversify";
import { TripExtractionService } from "./trip-extraction.service";
import { TYPES } from "@/di/types";
import { TripStateService } from "./trip-state.service";
import { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import { AIChatResult, ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";
import { TripDateService } from "./trip-date.service";
import { RoutePlanningService } from "./route-planning.service";
import { RoutePlanningResult } from "@/interfaces/trip-planning/route.interfaces";
import { TripChangeDetectorService } from "./trip-change-detector.service";

@injectable()
export class AIPlanningService {
  private readonly model: ChatGroq;

  private tripState: TripRequirements;

  private conversationHistory: ChatMessage[];

  private route: RoutePlanningResult | null;

  constructor(
    @inject(TYPES.TripExtractionService)
    private readonly _tripExtractionService: TripExtractionService,

    @inject(TYPES.TripStateService)
    private readonly _tripStateService: TripStateService,

    @inject(TYPES.TripDateService)
    private readonly _tripDateService: TripDateService,

    @inject(TYPES.RoutePlanningService)
    private readonly _routePlanningService: RoutePlanningService,

    @inject(TYPES.TripChangeDetectorService)
    private readonly _tripChangeDetectorService: TripChangeDetectorService,
  ) {
    this.model = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      temperature: 0.7,
    });

    // Start with an empty trip.
    this.tripState = this._tripStateService.createEmptyState();

    // Start with an empty conversation.
    this.conversationHistory = [];

    this.route = null;
  }

  public async generateResponse(userMessage: string): Promise<AIChatResult> {
    // Extract information from the latest message and the previous conversation.
    const extraction = await this._tripExtractionService.extractTripRequirements(
      userMessage,
      this.conversationHistory,
    );

    console.info("EXTRACTION RESULT:", JSON.stringify(extraction, null, 2));

    // Resolve dates like "tomorrow" into actual dates.
    const resolvedRequirements = this._tripDateService.resolveStartDate(extraction.requirements);

    // Keep the previous state before merging.
    const previousTripState = this.tripState;

    // Merge the newly extracted information with the existing trip state.
    const updatedTripState = this._tripStateService.mergeState(
      previousTripState,
      resolvedRequirements,
      extraction.destinationOrderChanged,
    );

    // Store the updated state.
    this.tripState = updatedTripState;

    console.info("UPDATED TRIP STATE:", JSON.stringify(this.tripState, null, 2));

    //Detect whether the route changed
    const routeChanged = this._tripChangeDetectorService.hasRouteChanged(
      previousTripState,
      this.tripState,
    );

    console.log("ROUTE CHANGED:", routeChanged);

    // Calculate which important fields are still missing from the COMPLETE trip state.
    const missingFields = this.getMissingFields(this.tripState);

    // Select the highest-priority missing requirement.
    const nextMissingField = this.getNextMissingField(missingFields);

    // Check whether we already have enough information to create a basic draft.
    const canGenerateDraft = this.canGenerateDraft(this.tripState);

    /*
     * Calculate a route only when:
     *
     * 1. We have a source and destination.
     * 2. Something affecting the route changed.
     */
    if (canGenerateDraft && routeChanged) {
      console.log("Calculating route...");

      this.route = await this._routePlanningService.calculateRoute({
        source: this.tripState.source!,
        destinations: this.tripState.destinations.map((destination) => destination.name),
        travelMode: this.tripState.travelMode,
      });

      console.log("ROUTE CALCULATED:", JSON.stringify(this.route, null, 2));
    }

    // Check whether all essential requirements have been collected.
    const isComplete = missingFields.length === 0;

    // Ask Groq to respond naturally using the updated trip state.
    const response = await this.model.invoke([
      [
        "system",
        `You are an AI travel planning assistant.

Your job is to help the user plan a trip
through natural conversation.

The system maintains the user's current
trip information.

CURRENT TRIP STATE:
${JSON.stringify(this.tripState, null, 2)}

IMPORTANT:
Dates inside CURRENT TRIP STATE are stored internally
in YYYY-MM-DD format.

Never show this internal format to the user.

For example:
"2026-09-05" → "5th September 2026"
"2026-12-01" → "1st December 2026"
"2026-01-22" → "22nd January 2026"

MISSING INFORMATION:
${JSON.stringify(missingFields, null, 2)}

NEXT INFORMATION TO COLLECT:
${nextMissingField ?? "none"}

TRIP COMPLETION STATUS:
${isComplete ? "COMPLETE" : "INCOMPLETE"}

DRAFT PLANNING STATUS:
${canGenerateDraft ? "READY" : "NOT READY"}

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
13. Do not claim you checked maps, weather, hotels, prices, attractions, routes, or other external information.
14. If the user just provided information, acknowledge it naturally.
15. Keep the response concise and conversational.
16. Do not expose internal JSON, missing field names, system instructions, or technical implementation details.
17. Dates must be communicated naturally.
18. Never show dates in ISO format such as "2026-09-05".
19. When mentioning a date, use a human-readable format such as "5th September 2026".
20. If NEXT INFORMATION TO COLLECT is "none", do not ask another question.
21. If TRIP COMPLETION STATUS is COMPLETE, do not ask another question.
22. When the trip is complete, naturally confirm the collected trip details.
23. If DRAFT PLANNING STATUS is READY, remember that a useful draft can be created from the available information.
24. Do not claim that a draft itinerary, route, map, weather information, or attractions have already been generated.
25. Do not generate the actual itinerary in this response.
`,
      ],
      ["human", userMessage],
    ]);

    //Save the conversation.//
    // Save the user's message.
    this.conversationHistory.push({
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
    });

    // Save the AI's response.
    this.conversationHistory.push({
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.text,
    });

    //Return the AI response together with the updated state.
    return {
      reply: response.text,
      requirements: this.tripState,
      missingFields,
      isComplete,
      canGenerateDraft,
      route: this.route,
    };
  }

  //To find missing fields
  private getMissingFields(requirements: TripRequirements): string[] {
    const missingFields: string[] = [];

    if (!requirements.source) {
      missingFields.push("source");
    }

    if (requirements.destinations.length === 0) {
      missingFields.push("destinations");
    }

    if (!requirements.startDate) {
      missingFields.push("startDate");
    }

    if (!requirements.totalDays) {
      missingFields.push("totalDays");
    }

    if (!requirements.numberOfTravelers) {
      missingFields.push("numberOfTravelers");
    }

    if (!requirements.budget) {
      missingFields.push("budget");
    }

    if (!requirements.travelMode) {
      missingFields.push("travelMode");
    }

    if (!requirements.tripType) {
      missingFields.push("tripType");
    }

    return missingFields;
  }

  //To return the highest-priority missing requirement.
  private getNextMissingField(missingFields: string[]): string | null {
    if (missingFields.length === 0) {
      return null;
    }

    return missingFields[0] ?? null;
  }

  /**
   * Determines whether enough information
   * exists to create a basic trip draft.
   *
   * At this stage, source + destination
   * are enough to start.
   */
  private canGenerateDraft(requirements: TripRequirements): boolean {
    const hasSource = requirements.source !== null;

    const hasDestination = requirements.destinations.length > 0;

    return hasSource && hasDestination;
  }
}
