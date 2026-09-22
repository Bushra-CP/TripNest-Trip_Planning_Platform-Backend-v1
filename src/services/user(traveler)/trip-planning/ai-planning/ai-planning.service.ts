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
  ) {}

  public async generateResponse(
    userId: string,
    userMessage: string,
    threadId?: string,
  ): Promise<AIChatResult> {
    let currentThreadId = threadId;
    let trip;

    //First message: Create a new Trip and a new LangGraph thread.
    if (!currentThreadId) {
      currentThreadId = this._uuidUtil.generate();

      trip = await this._tripRepository.create({
        ownerId: new Types.ObjectId(userId),
        threadId: currentThreadId,
      });
    } else {
      //Existing conversation: Find the Trip using the threadId.
      trip = await this._tripRepository.findByThreadId(currentThreadId);

      if (!trip) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
      }
    }

    console.log(trip);

    const result = await this._tripGraphService.processMessage(userMessage, currentThreadId);

    console.info("TRIP STATE:", JSON.stringify(result.tripRequirements, null, 2));

    console.info("TITLE:", JSON.stringify(result.title));

    //Update Trip title if the AI generated one.
    if (result.title) {
      await this._tripRepository.updateById(trip._id.toString(), {
        title: result.title,
      });
    }

    //Create or update TripRequirements.
    await this._tripRequirementsService.saveRequirements({
      tripId: trip._id.toString(),
      requirements: result.tripRequirements,
    });

    //Create or update TripRoute only when LangGraph has calculated a route.
    if (result.route) {
      await this._tripRouteService.saveRoute({
        tripId: trip._id.toString(),
        route: result.route,
      });
    }

    return {
      reply: result.response,

      title: result.title,

      requirements: result.tripRequirements,

      missingFields: result.missingFields,

      isComplete: result.isComplete,

      canGenerateDraft: result.canGenerateDraft,

      route: result.route,

      threadId: currentThreadId,
    };
  }
}
