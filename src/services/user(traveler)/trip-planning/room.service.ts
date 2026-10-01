import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IRoom } from "@/interfaces/IModel/trip-planning/IRoom";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/room.repository.interface";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { AppError } from "@/shared/errors/app.error";
import { randomBytes } from "crypto";
import { inject, injectable } from "inversify";
import { Types } from "mongoose";

@injectable()
export class RoomService implements IRoomService {
  constructor(
    @inject(TYPES.RoomRepository)
    private readonly _roomRepository: IRoomRepository,
  ) {}

  /**
   * Create a new room
   *
   * @param {string} userId
   * @param {string} tripId
   * @return {*}  {Promise<IRoom>}
   * @memberof RoomService
   */
  async createRoom(userId: string, tripId: string): Promise<IRoom> {
    const existingRoom = await this._roomRepository.findByTripId(tripId);

    if (existingRoom) {
      throw new AppError(STATUS_CODES.CONFLICT, "Room already exists for this trip");
    }

    const roomId = randomBytes(4).toString("hex").toUpperCase();

    return this._roomRepository.create({
      roomId,
      tripId: new Types.ObjectId(tripId),
      createdBy: new Types.ObjectId(userId),
    });
  }

  /**
   * Get an existing room
   *
   * @param {string} roomId
   * @return {*}  {Promise<IRoom>}
   * @memberof RoomService
   */
  async getRoom(roomId: string): Promise<IRoom> {
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(normalizedRoomId);

    if (!room) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.ROOM_NOT_FOUND);
    }

    return room;
  }
}
