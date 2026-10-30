import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { ILikesRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/likes.repository.interface";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import {
  LikeActionResponseDto,
  PostLikesResponseDto,
  PostLikeStatsDto,
} from "@/dtos/user(traveler)/trip-tales/likes.dto";
import { ILikesService } from "@/interfaces/IServices/user(traveler)/trip-tales/likes.service.interface";

@injectable()
export class LikesService implements ILikesService {
  constructor(
    @inject(TYPES.LikesRepository)
    private readonly _likesRepository: ILikesRepository,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,
  ) {}

  private validateId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid ID");
    }
  }

  private async getPublishedPost(postId: string): Promise<void> {
    this.validateId(postId);

    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post || post.status !== "PUBLISHED") {
      throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
    }
  }

  async likePost(postId: string, userId: string): Promise<LikeActionResponseDto> {
    this.validateId(postId);
    this.validateId(userId);

    await this.getPublishedPost(postId);

    await this._likesRepository.addLike(postId, userId);

    const likesCount = await this._likesRepository.countLikes(postId);

    return {
      postId,
      likesCount,
      isLikedByCurrentUser: true,
    };
  }

  async unlikePost(postId: string, userId: string): Promise<LikeActionResponseDto> {
    this.validateId(postId);
    this.validateId(userId);

    await this.getPublishedPost(postId);

    await this._likesRepository.removeLike(postId, userId);

    const likesCount = await this._likesRepository.countLikes(postId);

    return {
      postId,
      likesCount,
      isLikedByCurrentUser: false,
    };
  }

  async getPostLikes(postId: string, page: number, limit: number): Promise<PostLikesResponseDto> {
    await this.getPublishedPost(postId);

    const [likes, totalLikes] = await Promise.all([
      this._likesRepository.findLikesByPost(postId, page, limit),
      this._likesRepository.countLikes(postId),
    ]);

    const totalPages = Math.ceil(totalLikes / limit);

    return {
      postId,
      likesCount: totalLikes,

      likes: likes.map((like) => {
        const profile = like.userId.travelerProfile;

        return {
          userId: like.userId._id.toString(),
          fullName: profile?.fullName ?? "Traveler",
          profileImageUrl: profile?.profileImageUrl ?? "",
          likedAt: like.createdAt,
        };
      }),

      pagination: {
        currentPage: page,
        totalPages,
        totalLikes,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // To get like counts and the current user's like status for multiple posts.
  async getPostLikeStats(
    postIds: string[],
    userId?: string,
  ): Promise<Map<string, PostLikeStatsDto>> {
    const stats = new Map<string, PostLikeStatsDto>();

    if (postIds.length === 0) {
      return stats;
    }

    const [counts, likedPostIds] = await Promise.all([
      this._likesRepository.countLikesForPosts(postIds),

      userId ? this._likesRepository.findLikedPostIds(postIds, userId) : Promise.resolve([]),
    ]);

    const countMap = new Map(counts.map((item) => [item.postId, item.count]));

    const likedSet = new Set(likedPostIds);

    for (const postId of postIds) {
      stats.set(postId, {
        postId,
        likesCount: countMap.get(postId) ?? 0,
        isLikedByCurrentUser: likedSet.has(postId),
      });
    }

    return stats;
  }

  async deleteLikesByPostId(postId: string): Promise<void> {
    await this._likesRepository.deleteLikesByPostId(postId);
  }
}
