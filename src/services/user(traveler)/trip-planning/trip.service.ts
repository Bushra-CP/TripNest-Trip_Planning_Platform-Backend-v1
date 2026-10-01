import { inject, injectable } from "inversify";
import {
  ITripService,
  UpdateTripPayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/trip.service.interface";
import { TYPES } from "@/di/types";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { ITrip, TripMode } from "@/interfaces/IModel/trip-planning/ITrip";
import { AppError } from "@/shared/errors/app.error";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import mongoose, { Types } from "mongoose";
import { UUIDUtil } from "@/shared/utils/uuid.util";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { IMemberRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/member.repo.interface";

@injectable()
export class TripService implements ITripService {
  constructor(
    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,

    @inject(TYPES.RoomService)
    private readonly _roomService: IRoomService,

    @inject(TYPES.MemberRepository)
    private readonly _memberRepository: IMemberRepository,

    @inject(TYPES.UUIDUtil)
    private readonly _uuidUtil: UUIDUtil,
  ) {}

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

  /**
   * getTripByThreadId
   *
   * @param {string} threadId
   * @return {*}  {Promise<ITrip>}
   * @memberof TripService
   */
  async getTripByThreadId(threadId: string): Promise<ITrip> {
    const trip = await this._tripRepository.findByThreadId(threadId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    return trip;
  }

  /**
   * convertToGroupTrip
   *
   * @param {string} userId
   * @param {string} [threadId]
   * @return {*}  {Promise<ITrip>}
   * @memberof TripService
   */
  async convertToGroupTrip(userId: string, threadId?: string): Promise<ITrip> {
    let trip: ITrip;

    /*
     * CASE 1: No threadId → create a new group trip.
     */
    if (!threadId) {
      const newThreadId = this._uuidUtil.generate();

      trip = await this._tripRepository.create({
        ownerId: new Types.ObjectId(userId),
        tripMode: "group",
        status: "planning",
        threadId: newThreadId,
        roomId: null,
      });
    } else {
      /*
       * CASE 2: threadId exists → find the existing trip.
       */
      const existingTrip = await this._tripRepository.findByThreadId(threadId.trim());

      if (!existingTrip) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
      }

      // Only the owner can convert the trip.
      if (!existingTrip.ownerId || existingTrip.ownerId.toString() !== userId) {
        throw new AppError(
          STATUS_CODES.FORBIDDEN,
          "Only the trip owner can convert the trip to a group trip",
        );
      }

      //Don't convert an already-group trip.
      if (existingTrip.tripMode === "group") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Trip is already a group trip");
      }

      //Convert the existing trip to 'group' mode
      const updatedTrip = await this._tripRepository.updateById(existingTrip._id.toString(), {
        tripMode: "group",
      });

      if (!updatedTrip) {
        throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
      }

      trip = updatedTrip;
    }

    // Create the room using the Trip ID.
    const room = await this._roomService.createRoom(userId, trip._id.toString());

    // Store the room ID in the Trip.
    const updatedTrip = await this._tripRepository.updateById(trip._id.toString(), {
      roomId: room.roomId,
    });

    if (!updatedTrip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    //Create TripMember for the trip owner - The owner becomes the group admin.
    await this._memberRepository.create({
      tripId: updatedTrip._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: "OWNER",
    });

    return updatedTrip;
  }
}
