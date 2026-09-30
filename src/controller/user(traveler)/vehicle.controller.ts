import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { IVehicleService } from "@/interfaces/IServices/user(traveler)/trip-planning/vehicle.service.interface";
import { ResponseHandler } from "@/shared/http/responseHandler";
import {
  CreateVehicleRequestDto,
  UpdateVehicleRequestDto,
} from "@/dtos/user(traveler)/travel-planning/vehicle.dto";

@injectable()
export class VehicleController {
  constructor(
    @inject(TYPES.VehicleService)
    private readonly _vehicleService: IVehicleService,
  ) {}

  /**
   * CREATE VEHICLE
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*} {Promise<void>}
   * @memberof VehicleController
   */
  async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as CreateVehicleRequestDto;

      console.log(payload);

      const data = await this._vehicleService.createVehicle(req.user.userId, payload);

      ResponseHandler.success(res, STATUS_CODES.CREATED, SuccessMessages.VEHICLE_CREATED, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET VEHICLES
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*} {Promise<void>}
   * @memberof VehicleController
   */
  async getVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this._vehicleService.getVehicles(req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.VEHICLES_FETCHED, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET VEHICLE BY ID
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*} {Promise<void>}
   * @memberof VehicleController
   */
  async getVehicleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId } = req.params;

      if (!vehicleId || Array.isArray(vehicleId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_VEHICLE_ID);
        return;
      }

      const data = await this._vehicleService.getVehicleById(req.user.userId, vehicleId);

      if (!data) {
        ResponseHandler.error(res, STATUS_CODES.NOT_FOUND, ErrorMessages.VEHICLE_NOT_FOUND);
        return;
      }

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.VEHICLE_FETCHED, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * UPDATE VEHICLE
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*} {Promise<void>}
   * @memberof VehicleController
   */
  async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId } = req.params;

      if (!vehicleId || Array.isArray(vehicleId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_VEHICLE_ID);
        return;
      }

      const payload = req.body as UpdateVehicleRequestDto;

      const data = await this._vehicleService.updateVehicle(req.user.userId, vehicleId, payload);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.VEHICLE_UPDATED, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE VEHICLE
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*} {Promise<void>}
   * @memberof VehicleController
   */
  async deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vehicleId } = req.params;

      if (!vehicleId || Array.isArray(vehicleId)) {
        return next(new Error("Invalid vehicle ID"));
      }

      await this._vehicleService.deleteVehicle(req.user.userId, vehicleId);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.VEHICLE_DELETED);
    } catch (error) {
      next(error);
    }
  }
}
