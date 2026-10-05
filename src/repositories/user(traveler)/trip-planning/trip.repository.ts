import { ITrip } from "@/interfaces/IModel/trip-planning/ITrip";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { TripMemberModel } from "@/models/user(traveler)/trip-planning/trip-member.model";
import { TripModel } from "@/models/user(traveler)/trip-planning/trip.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import { QueryFilter } from "mongoose";

@injectable()
export class TripRepository extends BaseRepository<ITrip> implements ITripRepository {
  constructor() {
    super(TripModel);
  }

  async findByUserId(
    userId: string,
    search?: string,
    tripMode?: "solo" | "group",
  ): Promise<ITrip[]> {
    const members = await TripMemberModel.find({
      userId,
    }).select("tripId");

    const groupTripIds = members.map((member) => member.tripId);

    const conditions: QueryFilter<ITrip>[] = [
      {
        ownerId: userId,
        tripMode: "solo",
      },
      {
        _id: { $in: groupTripIds },
        tripMode: "group",
      },
    ];

    const filter: QueryFilter<ITrip> = {
      $or: conditions,
    };

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    if (tripMode) {
      filter.$or = conditions.filter((condition) => condition.tripMode === tripMode);
    }

    return TripModel.find(filter).sort({ createdAt: -1 }).exec();
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
