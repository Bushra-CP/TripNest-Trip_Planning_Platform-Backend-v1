import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IVehicle } from "@/interfaces/IModel/trip-planning/IVehicle";
import { IVehicleService } from "@/interfaces/IServices/user(traveler)/trip-planning/vehicle.service.interface";
import { AppError } from "@/shared/errors/app.error";
import { IVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/vehicle.repo.interface";
import { Types } from "mongoose";
import {
  CreateVehicleRequestDto,
  UpdateVehicleRequestDto,
} from "@/dtos/user(traveler)/travel-planning/vehicle.dto";

@injectable()
export class VehicleService implements IVehicleService {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly _vehicleRepository: IVehicleRepository,
  ) {}

  /**
   * CREATE VEHICLE
   *
   * @param {string} ownerId
   * @param {CreateVehiclePayload} payload
   * @return {*} {Promise<IVehicle>}
   * @memberof VehicleService
   */
  async createVehicle(ownerId: string, payload: CreateVehicleRequestDto): Promise<IVehicle> {
    return this._vehicleRepository.create({
      ownerId: new Types.ObjectId(ownerId),
      name: payload.name,
      type: payload.type,
      fuelType: payload.fuelType,
      fuelEfficiency: payload.fuelEfficiency,
      seatingCapacity: payload.seatingCapacity,
      ...(payload.additionalDetails !== undefined && {
        additionalDetails: payload.additionalDetails,
      }),
    });
  }

  /**
   * GET VEHICLES
   *
   * @param {string} ownerId
   * @return {*} {Promise<IVehicle[]>}
   * @memberof VehicleService
   */
  async getVehicles(ownerId: string): Promise<IVehicle[]> {
    return this._vehicleRepository.findByOwnerId(ownerId);
  }

  /**
   * GET VEHICLE BY ID
   *
   * @param {string} ownerId
   * @param {string} vehicleId
   * @return {*} {Promise<IVehicle | null>}
   * @memberof VehicleService
   */
  async getVehicleById(ownerId: string, vehicleId: string): Promise<IVehicle | null> {
    return this._vehicleRepository.findByIdAndOwnerId(vehicleId, ownerId);
  }

  /**
   * UPDATE VEHICLE
   *
   * @param {string} ownerId
   * @param {string} vehicleId
   * @param {UpdateVehiclePayload} payload
   * @return {*} {Promise<IVehicle>}
   * @memberof VehicleService
   */
  async updateVehicle(
    ownerId: string,
    vehicleId: string,
    payload: UpdateVehicleRequestDto,
  ): Promise<IVehicle> {
    const vehicle = await this._vehicleRepository.findByIdAndOwnerId(vehicleId, ownerId);

    if (!vehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.VEHICLE_NOT_FOUND);
    }

    const updatedVehicle = await this._vehicleRepository.updateById(vehicleId, payload);

    if (!updatedVehicle) {
      throw new AppError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ErrorMessages.FAILED_TO_UPDATE_VEHICLE,
      );
    }

    return updatedVehicle;
  }

  /**
   * DELETE VEHICLE
   *
   * @param {string} ownerId
   * @param {string} vehicleId
   * @return {*} {Promise<IVehicle>}
   * @memberof VehicleService
   */
  async deleteVehicle(ownerId: string, vehicleId: string): Promise<IVehicle> {
    const vehicle = await this._vehicleRepository.findByIdAndOwnerId(vehicleId, ownerId);

    if (!vehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.VEHICLE_NOT_FOUND);
    }

    const deletedVehicle = await this._vehicleRepository.deleteById(vehicleId);

    if (!deletedVehicle) {
      throw new AppError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ErrorMessages.FAILED_TO_DELETE_VEHICLE,
      );
    }

    return deletedVehicle;
  }
}
