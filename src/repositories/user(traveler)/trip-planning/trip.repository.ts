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

  async findByOwnerId(
    ownerId: string,
    search?: string,
    tripMode?: "solo" | "group",
  ): Promise<ITrip[]> {
    const filter: Record<string, unknown> = {
      ownerId,
    };

    if (search?.trim()) {
      filter.title = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (tripMode) {
      filter.tripMode = tripMode;
    }

    return this.model.find(filter).sort({ updatedAt: -1 }).exec();
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
