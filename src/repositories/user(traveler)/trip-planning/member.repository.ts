import { ITripMember } from "@/interfaces/IModel/trip-planning/ITripMember";
import {
  IMemberRepository,
  IPopulatedTripMember,
} from "@/interfaces/IRepository/user(traveler)/trip-planning/member.repo.interface";
import { TravelerProfileModel } from "@/models/user(traveler)/traveler-profile.model";
import { TripMemberModel } from "@/models/user(traveler)/trip-planning/trip-member.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import { Types } from "mongoose";

@injectable()
export class MemberRepository extends BaseRepository<ITripMember> implements IMemberRepository {
  constructor() {
    super(TripMemberModel);
  }

  async findByTripAndUser(tripId: string, userId: string): Promise<ITripMember | null> {
    return this.findOne({
      tripId: new Types.ObjectId(tripId),
      userId: new Types.ObjectId(userId),
    });
  }

  async findByTripId(tripId: string): Promise<IPopulatedTripMember[]> {
    const members = await this.model.aggregate([
      {
        $match: {
          tripId: new Types.ObjectId(tripId),
        },
      },

      // JOIN TRAVELER PROFILE
      {
        $lookup: {
          from: TravelerProfileModel.collection.name,

          localField: "userId",

          foreignField: "userId",

          as: "travelerProfile",
        },
      },

      {
        $unwind: {
          path: "$travelerProfile",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          tripId: 1,

          role: 1,

          joinedAt: 1,

          createdAt: 1,

          updatedAt: 1,

          userId: {
            _id: "$userId",

            fullName: {
              $ifNull: ["$travelerProfile.fullName", ""],
            },

            profileImageUrl: {
              $ifNull: ["$travelerProfile.profileImageUrl", ""],
            },
          },
        },
      },
    ]);

    return members as IPopulatedTripMember[];
  }

  async findByIdWithUser(memberId: string): Promise<IPopulatedTripMember | null> {
    const members = await this.model.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(memberId),
        },
      },

      // JOIN TRAVELER PROFILE
      {
        $lookup: {
          from: TravelerProfileModel.collection.name,

          localField: "userId",

          foreignField: "userId",

          as: "travelerProfile",
        },
      },

      {
        $unwind: {
          path: "$travelerProfile",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          tripId: 1,

          role: 1,

          joinedAt: 1,

          createdAt: 1,

          updatedAt: 1,

          userId: {
            _id: "$userId",

            fullName: {
              $ifNull: ["$travelerProfile.fullName", ""],
            },

            profileImageUrl: {
              $ifNull: ["$travelerProfile.profileImageUrl", ""],
            },
          },
        },
      },
    ]);

    return (members[0] as IPopulatedTripMember | undefined) ?? null;
  }
}
