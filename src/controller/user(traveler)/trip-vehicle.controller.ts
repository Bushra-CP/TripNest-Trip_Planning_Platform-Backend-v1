import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ITripVehicleService } from "@/interfaces/IServices/user(traveler)/trip-planning/trip-vehicle.service.interface";
import { Request, Response, NextFunction } from "express";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";

@injectable()
export class TripVehicleController {
  constructor(
    @inject(TYPES.TripVehicleService)
    private readonly _tripVehicleService: ITripVehicleService,
  ) {}

  /**
   * ADD VEHICLE TO TRIP
   */
  addVehicleToTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId, vehicleId } = req.body;
      const userId = req.user.userId;

      if (!tripId || !vehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.addVehicleToTrip(
        tripId,
        vehicleId,
        userId,
      );

      // console.log("addVehicleToTrip:", tripVehicle);

      ResponseHandler.success(
        res,
        STATUS_CODES.CREATED,
        SuccessMessages.VEHICLE_ADDED_TO_TRIP,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET ALL VEHICLES OF A TRIP
   */
  getTripVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId } = req.params;

      console.log(tripId);

      if (typeof tripId !== "string" || !tripId.trim()) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.TRIP_ID_IS_REQUIRED);
        return;
      }

      const tripVehicles = await this._tripVehicleService.getTripVehicles(tripId);

      // console.log("getTripVehicles:", tripVehicles);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.TRIP_VEHICLES_FETCHED,
        tripVehicles,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET FINAL SELECTED VEHICLE
   */
  getFinalSelectedVehicle = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tripId } = req.params;

      if (typeof tripId !== "string" || !tripId.trim()) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.TRIP_ID_IS_REQUIRED);
        return;
      }

      const tripVehicle = await this._tripVehicleService.getFinalSelectedVehicle(tripId);

      // console.log("getFinalSelectedVehicle:", tripVehicle);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.FINAL_VEHICLE_FETCHED,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * REMOVE VEHICLE FROM TRIP
   */
  removeVehicleFromTrip = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tripId, vehicleId } = req.body;
      const userId = req.user.userId;

      if (!tripId || !vehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.removeVehicleFromTrip(
        tripId,
        vehicleId,
        userId,
      );

      // console.log("removeVehicleFromTrip:", tripVehicle);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.VEHICLE_REMOVED_FROM_TRIP,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * VOTE FOR VEHICLE
   */
  voteForVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId, tripVehicleId } = req.body;
      const userId = req.user.userId;

      if (!tripId || !tripVehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_TRIP_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.voteForVehicle(
        tripId,
        tripVehicleId,
        userId,
      );

      // console.log("voteForVehicle:", tripVehicle);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.VEHICLE_VOTE_ADDED,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * REMOVE VOTE
   */
  removeVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId, tripVehicleId } = req.body;
      const userId = req.user.userId;

      if (!tripId || !tripVehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_TRIP_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.removeVote(tripId, tripVehicleId, userId);

      // console.log("removeVote:", tripVehicle);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.VEHICLE_VOTE_REMOVED,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * FINALIZE VEHICLE
   */
  finalizeVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tripId, tripVehicleId } = req.body;
      const userId = req.user.userId;

      if (!tripId || !tripVehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_TRIP_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.finalizeVehicle(
        tripId,
        tripVehicleId,
        userId,
      );

      // console.log("finalizeVehicle:", tripVehicle);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.VEHICLE_FINALIZED, tripVehicle);
    } catch (error) {
      next(error);
    }
  };

  async unfinalizeVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId, tripVehicleId } = req.body;

      const userId = req.user?.userId;

      if (!tripId || !tripVehicleId) {
        ResponseHandler.error(
          res,
          STATUS_CODES.BAD_REQUEST,
          ErrorMessages.TRIP_ID_AND_TRIP_VEHICLE_ID_ARE_REQUIRED,
        );
        return;
      }

      const tripVehicle = await this._tripVehicleService.unfinalizeVehicle(
        tripId,
        tripVehicleId,
        userId,
      );

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.VEHICLE_UNFINALIZED,
        tripVehicle,
      );
    } catch (error) {
      next(error);
    }
  }
}
