import { TYPES } from "@/di/types";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { AIPlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/ai-planning.service";
import { ResponseHandler } from "@/shared/http/responseHandler";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class AIPlanningController {
  constructor(
    @inject(TYPES.AIPlanningService)
    private readonly _aiPlanningService: AIPlanningService,
  ) {}

  /**
   * Send message
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof AIPlanningController
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, threadId } = req.body;

      if (typeof message !== "string" || message.trim().length === 0) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.MESSAGE_REQUIRED);

        return;
      }

      if (
        threadId !== undefined &&
        (typeof threadId !== "string" || threadId.trim().length === 0)
      ) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_THREAD_ID);

        return;
      }

      const userId = req.user?.userId;

      const result = await this._aiPlanningService.generateResponse(userId, message, threadId);

      console.log(result);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.AI_RESPONSE_GENERATED, {
        threadId: result.threadId,
        tripId: result.tripId,
        reply: result.reply,
        tripRequirements: result.requirements,
        missingFields: result.missingFields,
        isComplete: result.isComplete,
        canGenerateDraft: result.canGenerateDraft,
        route: result.route,
        ragSources: result.ragSources,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET PLANNING STATE
   *
   * @param {Request} req
   * @param {Response} res
   * @memberof AIPlanningController
   */
  getPlanningState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threadId } = req.params;

      if (!threadId || Array.isArray(threadId) || threadId.trim().length === 0) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_THREAD_ID);

        return;
      }

      const result = await this._aiPlanningService.getPlanningState(threadId);

      if (!result) {
        ResponseHandler.error(
          res,
          STATUS_CODES.NOT_FOUND,
          ErrorMessages.TRIP_PLANNING_STATE_NOT_FOUND,
        );

        return;
      }

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.TRIP_PLANNING_STATE_FETCHED, {
        threadId: result.threadId,
        tripId: result.tripId,
        title: result.title,
        conversationHistory: result.conversationHistory,
        tripRequirements: result.requirements,
        missingFields: result.missingFields,
        isComplete: result.isComplete,
        canGenerateDraft: result.canGenerateDraft,
        route: result.route,
      });
    } catch (error) {
      next(error);
    }
  };
}
