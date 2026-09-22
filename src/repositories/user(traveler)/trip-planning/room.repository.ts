import { injectable } from "inversify";

import { IRoom } from "@/interfaces/IModel/trip-planning/IRoom";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/room.repository.interface";
import { RoomModel } from "@/models/user(traveler)/trip-planning/room.model";
import { BaseRepository } from "@/repositories/base.repository";

@injectable()
export class RoomRepository extends BaseRepository<IRoom> implements IRoomRepository {
  constructor() {
    super(RoomModel);
  }

  async findByRoomId(roomId: string): Promise<IRoom | null> {
    return this.findOne({
      roomId,
    });
  }

  async findByTripId(tripId: string): Promise<IRoom | null> {
    return this.findOne({
      tripId,
    });
  }
}
