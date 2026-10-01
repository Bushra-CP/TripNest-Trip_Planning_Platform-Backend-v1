import { inject, injectable } from "inversify";
import { NextFunction, Request, Response } from "express";
import { TYPES } from "@/di/types";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { ITripService } from "@/interfaces/IServices/user(traveler)/trip-planning/trip.service.interface";

@injectable()
export class TripController {
  constructor(
    @inject(TYPES.TripService)
    private readonly _tripService: ITripService,
  ) {}

  /**
   * To get all trips of a user
   *
   * @param {Request} req
   * @param {Response} res
   * @memberof TripController
   */
  getMyTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);

        return;
      }

      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const tripMode =
        req.query.tripMode === "solo" || req.query.tripMode === "group"
          ? req.query.tripMode
          : undefined;

      const trips = await this._tripService.getTripsByOwnerId(userId, search, tripMode);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.TRIPS_FETCHED, trips);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Convert a trip to a group trip
   *
   * @param {Request} req
   * @param {Response} res
   * @return {*}  {Promise<void>}
   * @memberof TripController
   */
  async convertToGroupTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { threadId } = req.body;

      if (
        threadId !== undefined &&
        (typeof threadId !== "string" || threadId.trim().length === 0)
      ) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_THREAD_ID);

        return;
      }

      const userId = req.user.userId;

      if (!userId) {
        ResponseHandler.error(res, STATUS_CODES.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);

        return;
      }

      const trip = await this._tripService.convertToGroupTrip(userId, threadId);

      console.log(trip);

      ResponseHandler.success(res, STATUS_CODES.CREATED, SuccessMessages.GROUP_TRIP_CREATED, trip);
    } catch (error) {
      next(error);
    }
  }

  /**
   * getTripByThreadId
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof TripController
   */
  getTripByThreadId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threadId } = req.params;

      if (!threadId || Array.isArray(threadId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_THREAD_ID);
        return;
      }

      const trip = await this._tripService.getTripByThreadId(threadId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Trip fetched successfully", trip);
    } catch (error) {
      next(error);
    }
  };
}
