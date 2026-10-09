import { TYPES } from "@/di/types";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ITripCostService } from "@/interfaces/trip-planning/trip-cost/trip-cost.service.interface";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { NextFunction, Request, Response } from "express";

import { inject, injectable } from "inversify";

@injectable()
export class TripCostController {
  constructor(
    @inject(TYPES.TripCostService)
    private readonly _tripCostService: ITripCostService,
  ) {}

  async getTripVehicleCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId } = req.params;

      if (typeof tripId !== "string" || !tripId.trim()) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.TRIP_ID_IS_REQUIRED);
        return;
      }

      const costs = await this._tripCostService.getTripVehicleCosts(tripId);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.TRIP_VEHICLE_COSTS_FETCHED,
        costs,
      );
    } catch (error) {
      next(error);
    }
  }
}
