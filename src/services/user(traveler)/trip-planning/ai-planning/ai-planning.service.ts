import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import type { AIChatResult } from "@/interfaces/trip-planning/ai-planning.interfaces";
import { TripGraphService } from "./graph/trip-graph.service";
import { UUIDUtil } from "@/shared/utils/uuid.util";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { Types } from "mongoose";
import { TripRequirementsService } from "../trip-requirements.service";
import { TripRouteService } from "../trip-route.service";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";
import { ItineraryService } from "../itinerary/itinerary.service";
import { IItineraryIngestionQueue } from "@/interfaces/IQueue/itinerary-ingestion-job.interfaces";

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

    // First message: Create a new Trip and a new LangGraph thread.
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
      // Existing conversation: Find the Trip using the threadId.
      trip = await this._tripRepository.findByThreadId(currentThreadId);

      if (!trip) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
      }

      // If the trip was created by a guest and the user is now logged in,
      // associate the trip with that user.
      if (userId && !trip.ownerId) {
        console.log("Assigning trip to user:", userId);

        await this._tripRepository.updateOne(
          { threadId: currentThreadId },
          {
            ownerId: new Types.ObjectId(userId),
          },
        );

        trip.ownerId = new Types.ObjectId(userId);
      }
    }

    // console.log("TRIP:", trip);

    const result = await this._tripGraphService.processMessage(userMessage, currentThreadId);

    console.info("TRIP STATE:", JSON.stringify(result.tripRequirements, null, 2));

    console.info("TITLE:", JSON.stringify(result.title));

    // Update Trip title if the AI generated one.
    if (result.title) {
      await this._tripRepository.updateById(trip._id.toString(), {
        title: result.title,
      });
    }

    // Create or update TripRequirements.
    await this._tripRequirementsService.saveRequirements({
      tripId: trip._id.toString(),
      requirements: result.tripRequirements,
    });

    // Create or update TripRoute only when LangGraph has calculated a route.
    if (result.route) {
      await this._tripRouteService.saveRoute({
        tripId: trip._id.toString(),
        route: result.route,
      });
    }

    let reply = result.response;
    let conversationHistory = result.conversationHistory;

    console.log("result.itineraryGeneratedNow:", result.itineraryGeneratedNow);
    console.log("result.generatedItinerary:", result.generatedItinerary);

    // Save only an itinerary generated during this invocation.
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

      // Queue RAG ingestion without waiting for embeddings.
      // Add the itinerary to the ingestion queue.
      if (!savedItinerary.templateId) {
        console.log("Handling over job to Itinerary worker");

        await this._itineraryIngestionQueue.addJob({
          itineraryId: savedItinerary._id.toString(),
        });
      }

      reply =
        "Your itinerary is ready! You can view it in the Itinerary tab. If you'd like any changes, just tell me here!";

      const lastMessage = result.conversationHistory[result.conversationHistory.length - 1];

      if (lastMessage) {
        conversationHistory = [
          ...result.conversationHistory.slice(0, -1),
          {
            id: lastMessage.id,
            role: "assistant",
            content: reply,
            ...(lastMessage.ragSources !== undefined && {
              ragSources: lastMessage.ragSources,
            }),
          },
        ];
      } else {
        conversationHistory = [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
          },
        ];
      }

      // Save the updated conversation history in LangGraph.
      await this._tripGraphService.updateConversationHistory(currentThreadId, conversationHistory);
    }

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

    console.log("itinerary:", itinerary);

    return {
      reply: state.response,
      title: state.title,
      requirements: state.tripRequirements,
      missingFields: state.missingFields,
      isComplete: state.isComplete,
      canGenerateDraft: state.canGenerateDraft,
      routeChanged: state.routeChanged,
      route: state.route,
      ragSources: state.ragSources,
      conversationHistory: state.conversationHistory,
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
