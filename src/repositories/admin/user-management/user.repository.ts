import type { PipelineStage } from "mongoose";

import { BaseRepository } from "@/repositories/base.repository";

import { UserModel } from "@/models/auth/user.model";
import { TravelerProfileModel } from "@/models/user(traveler)/traveler-profile.model";

import { IUser } from "@/interfaces/IModel/IUser";

import { IAdminUserRepository } from "@/interfaces/IRepository/admin/user-management/IAdminUserRepository";

import {
  GetUsersRequestDto,
  PaginatedUsers,
  UserWithProfile,
} from "@/dtos/admin/user-management/users.dto";

import { UserRole } from "@/enums/user-role.enum";
import { UserStatus } from "@/enums/user-status.enum";
import { injectable } from "inversify";

interface AggregationResult {
  users: UserWithProfile[];

  totalCount: {
    count: number;
  }[];
}

@injectable()
export class AdminUserRepository extends BaseRepository<IUser> implements IAdminUserRepository {
  constructor() {
    super(UserModel);
  }

  /*-----------------------
  GET USERS
  ------------------------*/
  async getUsers(query: GetUsersRequestDto): Promise<PaginatedUsers> {
    const { page, limit, search, status } = query;

    const skip = (page - 1) * limit;

    //MATCH USER ROLE - TRAVELER
    const userMatch: Record<string, unknown> = {
      role: UserRole.TRAVELER,
    };

    //FILTER BY STATUS
    if (status) {
      userMatch.isActive = status === UserStatus.ACTIVE;
    }

    //AGGREGATION PIPELINE
    const pipeline: PipelineStage[] = [
      {
        $match: userMatch,
      },

      {
        $lookup: {
          from: TravelerProfileModel.collection.name,
          localField: "_id",
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

      //SEARCH
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    email: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    "travelerProfile.fullName": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    "travelerProfile.phone": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                ],
              },
            } as PipelineStage.Match,
          ]
        : []),

      //LATEST USERS FIRST
      {
        $sort: {
          createdAt: -1,
        },
      },

      //SELECT ONLY REQUIRED FIELDS
      {
        $project: {
          _id: 0,

          id: "$_id",

          email: 1,

          role: 1,

          isActive: 1,

          createdAt: 1,

          fullName: "$travelerProfile.fullName",

          phone: "$travelerProfile.phone",

          profileImageUrl: "$travelerProfile.profileImageUrl",
        },
      },

      //PAGINATION
      {
        $facet: {
          users: [
            {
              $skip: skip,
            },

            {
              $limit: limit,
            },
          ],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const [result] = await UserModel.aggregate<AggregationResult>(pipeline);

    const users = result?.users ?? [];

    const totalItems = result?.totalCount?.[0]?.count ?? 0;

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      users,

      page,

      limit,

      totalItems,

      totalPages,
    };
  }
}
