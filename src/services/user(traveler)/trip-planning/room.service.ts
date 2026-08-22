import { TYPES } from "@/di/types";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IRoomRepository";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { randomBytes } from "crypto";
import { inject, injectable } from "inversify";
import mongoose from "mongoose";

@injectable()
export class RoomService implements IRoomService {
  constructor(
    @inject(TYPES.RoomRepository)
    private readonly _roomRepository: IRoomRepository,
  ) {}

  /**
   * Create a new room
   */
  async createRoom(userId: string): Promise<{
    roomId: string;
  }> {
    const roomId = randomBytes(4).toString("hex").toUpperCase();

    const room = await this._roomRepository.create({
      roomId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return {
      roomId: room.roomId,
    };
  }

  /**
   * Get an existing room
   */
  async getRoom(roomId: string): Promise<{
    roomId: string;
  }> {
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(normalizedRoomId);

    if (!room) {
      throw new Error("Room not found");
    }

    return {
      roomId: room.roomId,
    };
  }
}
