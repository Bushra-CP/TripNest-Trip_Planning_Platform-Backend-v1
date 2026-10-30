import type {
  IPopulatedPost,
  IPost,
  PostStatus,
} from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { ITripTalesRepository } from "@/interfaces/IRepository/admin/trip-tales/trip-tales.repo.interface";
import { PostModel } from "@/models/user(traveler)/trip-tales/post.model";
import { BaseRepository } from "@/repositories/base.repository";
import { injectable } from "inversify";
import { Types, type PipelineStage } from "mongoose";

@injectable()
export class TripTalesRepository extends BaseRepository<IPost> implements ITripTalesRepository {
  constructor() {
    super(PostModel);
  }

  async findPosts(
    page: number,
    limit: number,
    search?: string,
    status?: PostStatus,
    sort: "newest" | "oldest" = "newest",
  ): Promise<IPopulatedPost[]> {
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "travelerprofiles",
          localField: "user.travelerProfile",
          foreignField: "_id",
          as: "travelerProfile",
        },
      },
      {
        $unwind: {
          path: "$travelerProfile",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const match: Record<string, unknown> = {};

    if (status) {
      match.status = status;
    }

    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      match.$or = [
        { title: searchRegex },
        { destination: searchRegex },
        { tags: searchRegex },
        { "travelerProfile.fullName": searchRegex },
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({
        $match: match,
      });
    }

    pipeline.push(
      {
        $sort: {
          createdAt: sort === "oldest" ? 1 : -1,
          _id: sort === "oldest" ? 1 : -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          userId: {
            _id: "$user._id",
            travelerProfile: {
              fullName: "$travelerProfile.fullName",
              profileImageUrl: "$travelerProfile.profileImageUrl",
            },
          },
          title: 1,
          destination: 1,
          content: 1,
          tags: 1,
          media: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    );

    return PostModel.aggregate<IPopulatedPost>(pipeline).exec();
  }

  async countPosts(search?: string, status?: PostStatus): Promise<number> {
    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "travelerprofiles",
          localField: "user.travelerProfile",
          foreignField: "_id",
          as: "travelerProfile",
        },
      },
      {
        $unwind: {
          path: "$travelerProfile",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const match: Record<string, unknown> = {};

    if (status) {
      match.status = status;
    }

    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      match.$or = [
        { title: searchRegex },
        { destination: searchRegex },
        { tags: searchRegex },
        { "travelerProfile.fullName": searchRegex },
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({
        $match: match,
      });
    }

    pipeline.push({
      $count: "total",
    });

    const result = await PostModel.aggregate<{ total: number }>(pipeline).exec();

    return result[0]?.total ?? 0;
  }

  async countPostsByStatus(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    blockedPosts: number;
  }> {
    const result = await PostModel.aggregate<{
      _id: PostStatus | null;
      count: number;
    }>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const publishedPosts = result.find((item) => item._id === "PUBLISHED")?.count ?? 0;

    const blockedPosts = result.find((item) => item._id === "BLOCKED")?.count ?? 0;

    return {
      totalPosts: publishedPosts + blockedPosts,
      publishedPosts,
      blockedPosts,
    };
  }

  async updatePostStatus(postId: string, status: PostStatus): Promise<IPost | null> {
    if (!Types.ObjectId.isValid(postId)) {
      return null;
    }

    return PostModel.findByIdAndUpdate(
      postId,
      { $set: { status } },
      { new: true, runValidators: true },
    ).exec();
  }
}
