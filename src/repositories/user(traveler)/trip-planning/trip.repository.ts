import { ITrip } from "@/interfaces/IModel/trip-planning/ITrip";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { TripModel } from "@/models/user(traveler)/trip-planning/trip.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";

@injectable()
export class TripRepository extends BaseRepository<ITrip> implements ITripRepository {
  constructor() {
    super(TripModel);
  }

  async findByOwnerId(ownerId: string): Promise<ITrip[]> {
    return this.find({
      ownerId,
    });
  }

  async findByThreadId(threadId: string): Promise<ITrip | null> {
    return this.findOne({
      threadId,
    });
  }

  async findByRoomId(roomId: string): Promise<ITrip | null> {
    return this.findOne({
      roomId,
    });
  }
}
