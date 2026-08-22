import { injectable } from "inversify";

import { IRoom } from "@/interfaces/IModel/IRoom";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IRoomRepository";
import { RoomModel } from "@/models/user(traveler)/room.model";
import { BaseRepository } from "@/repositories/base.repository";

@injectable()
export class RoomRepository extends BaseRepository<IRoom> implements IRoomRepository {
  constructor() {
    super(RoomModel);
  }

  //Find room by room ID
  async findByRoomId(roomId: string): Promise<IRoom | null> {
    return this.findOne({
      roomId,
    });
  }
}
