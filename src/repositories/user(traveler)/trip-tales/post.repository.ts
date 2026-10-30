import { injectable } from "inversify";
import { BaseRepository } from "@/repositories/base.repository";
import {
  IPopulatedPost,
  IPost,
  PostStatus,
} from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { PostModel } from "@/models/user(traveler)/trip-tales/post.model";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { Types } from "mongoose";

@injectable()
export class PostRepository extends BaseRepository<IPost> implements IPostRepository {
  constructor() {
    super(PostModel);
  }

  // Get all published posts with user information.
  async findPublishedWithUser(): Promise<IPopulatedPost[]> {
    return this.model
      .find({ status: "PUBLISHED" })
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .sort({ createdAt: -1 })
      .exec() as Promise<IPopulatedPost[]>;
  }

  // Get one post with user information.
  async findByIdWithUser(postId: string): Promise<IPopulatedPost | null> {
    return this.model
      .findById(postId)
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .exec() as Promise<IPopulatedPost | null>;
  }

  // Count posts belonging to a particular user.
  async countByUserId(userId: string): Promise<number> {
    return this.model
      .countDocuments({
        userId,
      })
      .exec();
  }

  // Get the authenticated user's posts with pagination and filters.
  async findMyPosts(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    status?: PostStatus,
    sort: "newest" | "oldest" = "newest",
  ): Promise<IPopulatedPost[]> {
    const filter = this.buildMyPostsFilter(userId, search, status);

    const skip = (page - 1) * limit;

    return this.model
      .find(filter)
      .populate({
        path: "userId",
        populate: {
          path: "travelerProfile",
        },
      })
      .sort({
        createdAt: sort === "newest" ? -1 : 1,
      })
      .skip(skip)
      .limit(limit)
      .exec() as Promise<IPopulatedPost[]>;
  }

  // Count posts matching the same filters.
  async countMyPosts(userId: string, search?: string, status?: PostStatus): Promise<number> {
    const filter = this.buildMyPostsFilter(userId, search, status);

    return this.model.countDocuments(filter).exec();
  }

  // Find a post belonging to the authenticated user.
  async findMyPostById(postId: string, userId: string): Promise<IPost | null> {
    return this.model
      .findOne({
        _id: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  // Update a post belonging to the authenticated user.
  async updateMyPost(
    postId: string,
    userId: string,
    payload: Partial<IPost>,
  ): Promise<IPost | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(postId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }

  // Delete a post belonging to the authenticated user.
  async deleteMyPost(postId: string, userId: string): Promise<IPost | null> {
    return this.model
      .findOneAndDelete({
        _id: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  // Build the common filter for My Posts queries.
  private buildMyPostsFilter(userId: string, search?: string, status?: PostStatus) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (status) {
      filter.status = status;
    }

    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { title: searchRegex },
        { destination: searchRegex },
        { content: searchRegex },
        { tags: searchRegex },
      ];
    }

    return filter;
  }
}
