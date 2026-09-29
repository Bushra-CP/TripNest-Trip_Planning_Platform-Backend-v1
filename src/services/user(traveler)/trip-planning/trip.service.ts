import { inject, injectable } from "inversify";
import {
  CreateTripPayload,
  ITripService,
  UpdateTripPayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/trip.service.interface";
import { TYPES } from "@/di/types";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { ITrip, TripMode } from "@/interfaces/IModel/trip-planning/ITrip";
import { AppError } from "@/shared/errors/app.error";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { Types } from "mongoose";

@injectable()
export class TripService implements ITripService {
  constructor(
    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,
  ) {}

  /**
   * createTrip
   *
   * @param {CreateTripPayload} payload
   * @return {*}  {Promise<ITrip>}
   * @memberof TripService
   */
  async createTrip(payload: CreateTripPayload): Promise<ITrip> {
    const { ownerId, threadId, title } = payload;

    // A LangGraph thread represents one AI planning conversation.
    // We should not create multiple permanent trips for the same thread.
    const existingTrip = await this._tripRepository.findByThreadId(threadId);

    if (existingTrip) {
      return existingTrip;
    }

    const trip = await this._tripRepository.create({
      ownerId: new Types.ObjectId(ownerId),
      threadId,
      title,
      tripMode: "solo",
      status: "planning",
      roomId: null,
    });

    return trip;
  }

  /**
   * getTripsByOwnerId
   *
   * @param {string} ownerId
   * @return {*}  {Promise<ITrip[]>}
   * @memberof TripService
   */
  async getTripsByOwnerId(
    ownerId: string,
    search?: string,
    tripMode?: "solo" | "group",
  ): Promise<ITrip[]> {
    return this._tripRepository.findByOwnerId(ownerId, search, tripMode);
  }

  /**
   * updateTrip
   *
   * @param {string} tripId
   * @param {UpdateTripPayload} data
   * @return {*}  {Promise<ITrip>}
   * @memberof TripService
   */
  async updateTrip(tripId: string, data: UpdateTripPayload): Promise<ITrip> {
    const trip = await this._tripRepository.updateById(tripId, data);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    return trip;
  }

  /**
   * updateTripMode
   *
   * @param {string} tripId
   * @param {TripMode} tripMode
   * @return {*}  {Promise<ITrip>}
   * @memberof TripService
   */
  async updateTripMode(tripId: string, tripMode: TripMode): Promise<ITrip> {
    const trip = await this._tripRepository.updateById(tripId, {
      tripMode,
    });

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    return trip;
  }
}
