import { TYPES } from "@/di/types";
import { AIPlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/ai-planning.service";
import type { Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class AIPlanningController {
  constructor(
    @inject(TYPES.AIPlanningService)
    private readonly _aiPlanningService: AIPlanningService,
  ) {}

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body;

      if (typeof message !== "string" || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Message is required",
        });

        return;
      }

      const result = await this._aiPlanningService.generateResponse(message);

      // console.log(result);

      res.status(200).json({
        success: true,

        data: {
          reply: result.reply,

          tripRequirements: result.requirements,

          missingFields: result.missingFields,

          isComplete: result.isComplete,

          canGenerateDraft: result.canGenerateDraft,

          route: result.route,
        },
      });
    } catch (error) {
      console.error("AI chat error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to process AI response",
      });
    }
  };
}
