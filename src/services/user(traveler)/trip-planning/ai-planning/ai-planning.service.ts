import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";

import type { AIChatResult } from "@/interfaces/trip-planning/ai-planning.interfaces";
import { TripGraphService } from "./graph/trip-graph.service";
import { UUIDUtil } from "@/shared/utils/uuid.util";

@injectable()
export class AIPlanningService {
  constructor(
    @inject(TYPES.TripGraphService)
    private readonly _tripGraphService: TripGraphService,

    @inject(TYPES.UUIDUtil)
    private readonly _uuidUtil: UUIDUtil,
  ) {}

  public async generateResponse(userMessage: string, threadId?: string): Promise<AIChatResult> {
    const currentThreadId = threadId ?? this._uuidUtil.generate();

    const result = await this._tripGraphService.processMessage(userMessage, currentThreadId);

    console.info("TRIP STATE:", JSON.stringify(result.tripRequirements, null, 2));

    console.info("ROUTE:", JSON.stringify(result.route, null, 2));

    return {
      reply: result.response,

      requirements: result.tripRequirements,

      missingFields: result.missingFields,

      isComplete: result.isComplete,

      canGenerateDraft: result.canGenerateDraft,

      route: result.route,

      threadId: currentThreadId,
    };
  }
}
