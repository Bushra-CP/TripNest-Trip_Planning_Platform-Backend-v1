import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";

import { TYPES } from "@/di/types";
import type { AIChatResult } from "@/interfaces/trip-planning/ai-planning.interfaces";
import type { ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";
import { TripGraphService } from "./graph/trip-graph.service";
import { UUIDUtil } from "@/shared/utils/uuid.util";
import type { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { TripRequirementsService } from "../trip-requirements.service";
import { TripRouteService } from "../trip-route.service";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";
import { ItineraryService } from "../itinerary/itinerary.service";
import type { IItineraryIngestionQueue } from "@/interfaces/IQueue/itinerary-ingestion-job.interfaces";

@injectable()
export class AIPlanningService {
  constructor(
    @inject(TYPES.TripGraphService)
    private readonly _tripGraphService: TripGraphService,

    @inject(TYPES.UUIDUtil)
    private readonly _uuidUtil: UUIDUtil,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,

    @inject(TYPES.TripRequirementsService)
    private readonly _tripRequirementsService: TripRequirementsService,

    @inject(TYPES.TripRouteService)
    private readonly _tripRouteService: TripRouteService,

    @inject(TYPES.ItineraryService)
    private readonly _itineraryService: ItineraryService,

    @inject(TYPES.ItineraryIngestionQueue)
    private readonly _itineraryIngestionQueue: IItineraryIngestionQueue,
  ) {}

  public async generateResponse(
    userId: string | null,
    userMessage: string,
    threadId?: string,
  ): Promise<AIChatResult> {
    let currentThreadId = threadId;
    let trip;

    // Create a new trip and conversation thread for the first message.
    if (!currentThreadId) {
      currentThreadId = this._uuidUtil.generate();

      trip = await this._tripRepository.create({
        ownerId: userId ? new Types.ObjectId(userId) : null,
        threadId: currentThreadId,
        tripMode: "solo",
        status: "planning",
        roomId: null,
      });
    } else {
      trip = await this._tripRepository.findByThreadId(currentThreadId);

      if (!trip) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
      }

      // Associate a previously guest-owned trip with the logged-in user.
      if (userId && !trip.ownerId) {
        await this._tripRepository.updateOne(
          { threadId: currentThreadId },
          {
            ownerId: new Types.ObjectId(userId),
          },
        );

        trip.ownerId = new Types.ObjectId(userId);
      }
    }

    const result = await this._tripGraphService.processMessage(
      userMessage,
      currentThreadId,
      trip._id.toString(),
    );

    console.info("TRIP STATE:", JSON.stringify(result.tripRequirements, null, 2));

    console.info("TITLE:", result.title);

    // Update the trip title when the graph provides one.
    if (result.title) {
      await this._tripRepository.updateById(trip._id.toString(), {
        title: result.title,
      });
    }

    // Persist the latest trip requirements.
    await this._tripRequirementsService.saveRequirements({
      tripId: trip._id.toString(),
      requirements: result.tripRequirements,
    });

    // Persist the route only when the graph provides one.
    if (result.route) {
      await this._tripRouteService.saveRoute({
        tripId: trip._id.toString(),
        route: result.route,
      });
    }

    let reply = result.response;
    const conversationHistory: ChatMessage[] = [...(result.conversationHistory ?? [])];

    console.log("result.itineraryGeneratedNow:", result.itineraryGeneratedNow);

    console.log("result.generatedItinerary:", result.generatedItinerary);

    /*
     * Save an itinerary only when this graph invocation generated one.
     * This does not run for an ordinary modification request.
     */
    if (result.itineraryGeneratedNow && result.generatedItinerary) {
      const savedItinerary = await this._itineraryService.saveItinerary({
        tripId: trip._id.toString(),
        threadId: currentThreadId,
        userId,
        requirements: result.tripRequirements,
        title: result.generatedItinerary.title,
        days: result.generatedItinerary.days,
      });

      console.log("Saved itinerary:", savedItinerary);

      // Queue ingestion without waiting for the worker to finish.
      if (!savedItinerary.templateId) {
        await this._itineraryIngestionQueue.addJob({
          itineraryId: savedItinerary._id.toString(),
        });
      }

      reply =
        "Your itinerary is ready! You can view it in the Itinerary tab. If you'd like any changes, just tell me here!";
    }

    /*
     * Ensure this turn is represented in conversation history.
     *
     * Some graph nodes append the user and assistant messages themselves.
     * Other nodes, such as itinerary modification nodes, may only return
     * a response. Handle both cases without duplicating the current turn.
     */

    const lastMessage = conversationHistory[conversationHistory.length - 1];

    const previousMessage = conversationHistory[conversationHistory.length - 2];

    const currentTurnAlreadyHasAssistantResponse =
      lastMessage?.role === "assistant" &&
      previousMessage?.role === "user" &&
      previousMessage.content === userMessage;

    if (currentTurnAlreadyHasAssistantResponse) {
      // Keep the existing assistant ID and any attached RAG sources.
      conversationHistory[conversationHistory.length - 1] = {
        ...lastMessage,
        content: reply,
      };
    } else {
      const lastUserMessage = [...conversationHistory]
        .reverse()
        .find((message) => message.role === "user");

      if (lastUserMessage?.content !== userMessage) {
        conversationHistory.push({
          id: randomUUID(),
          role: "user",
          content: userMessage,
        });
      }

      conversationHistory.push({
        id: randomUUID(),
        role: "assistant",
        content: reply,
        ...(result.ragSources.length > 0 ? { ragSources: result.ragSources } : {}),
      });
    }

    /*
     * IMPORTANT:
     * Save history for every response type, including:
     * - Normal trip-planning messages
     * - Itinerary creation
     * - Itinerary modification feasibility responses
     * - Modification confirmation responses
     * - Successful modification responses
     */
    await this._tripGraphService.updateConversationHistory(currentThreadId, conversationHistory);

    console.log("PERSISTED CONVERSATION HISTORY:", JSON.stringify(conversationHistory, null, 2));

    return {
      reply,
      title: result.title,
      requirements: result.tripRequirements,
      missingFields: result.missingFields,
      isComplete: result.isComplete,
      canGenerateDraft: result.canGenerateDraft,
      routeChanged: result.routeChanged,
      route: result.route,
      ragSources: result.ragSources,
      conversationHistory,
      threadId: currentThreadId,
      tripId: trip._id.toString(),
      generatedItinerary: result.generatedItinerary,
    };
  }

  public async getPlanningState(threadId: string): Promise<AIChatResult | null> {
    const trip = await this._tripRepository.findByThreadId(threadId);

    if (!trip) {
      return null;
    }

    const state = await this._tripGraphService.getState(threadId);

    if (!state) {
      return null;
    }

    const itinerary = await this._itineraryService.getItineraryByTripId(
      trip._id.toString(),
      threadId,
    );

    console.log(
      "RESTORED CONVERSATION HISTORY:",
      JSON.stringify(state.conversationHistory, null, 2),
    );

    return {
      reply: state.response,
      title: state.title,
      requirements: state.tripRequirements,
      missingFields: state.missingFields,
      isComplete: state.isComplete,
      canGenerateDraft: state.canGenerateDraft,
      routeChanged: state.routeChanged,
      route: state.route,
      ragSources: state.ragSources ?? [],
      conversationHistory: state.conversationHistory ?? [],
      threadId,
      tripId: trip._id.toString(),
      generatedItinerary: itinerary
        ? {
            title: itinerary.title,
            days: itinerary.days,
          }
        : null,
    };
  }
}
