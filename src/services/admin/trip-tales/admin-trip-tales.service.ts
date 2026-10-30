import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import type {
  AdminTripTalesPostDto,
  AdminTripTalesQueryDto,
  AdminTripTalesStatsDto,
  PaginatedAdminTripTalesResponseDto,
} from "@/dtos/admin/trip-tales/admin-trip-tales.dto";
import { IAdminTripTalesService } from "@/interfaces/IServices/admin/admin-trip-tales.service.interface";
import { ITripTalesRepository } from "@/interfaces/IRepository/admin/trip-tales/trip-tales.repo.interface";
import { TripTalesPostMapper } from "@/mapper/trip-tales-post.mapper";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { AppError } from "@/shared/errors/app.error";
import { IKnowledgeChunkRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import { IKnowledgeDocumentRepository } from "@/interfaces/IRepository/admin/knowledge-docs-management/IKnowledgeDocumentRepository";

@injectable()
export class AdminTripTalesService implements IAdminTripTalesService {
  constructor(
    @inject(TYPES.TripTalesRepository)
    private readonly _tripTalesRepository: ITripTalesRepository,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,

    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: IKnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: IKnowledgeChunkRepository,
  ) {}

  async getPosts(query: AdminTripTalesQueryDto): Promise<PaginatedAdminTripTalesResponseDto> {
    const page = Math.max(1, Math.floor(query.page ?? 1));

    const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 10)));

    const sort = query.sort ?? "newest";

    const [posts, totalPosts] = await Promise.all([
      this._tripTalesRepository.findPosts(page, limit, query.search, query.status, sort),

      this._tripTalesRepository.countPosts(query.search, query.status),
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts: posts.map((post) => TripTalesPostMapper.toAdminPostResponse(post)),

      pagination: {
        currentPage: page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    };
  }

  async getPostById(postId: string): Promise<AdminTripTalesPostDto | null> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
    }

    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post) {
      return null;
    }

    return TripTalesPostMapper.toAdminPostResponse(post);
  }

  async getStats(): Promise<AdminTripTalesStatsDto> {
    return this._tripTalesRepository.countPostsByStatus();
  }

  async blockPost(postId: string): Promise<void> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
    }

    const existingPost = await this._postRepository.findByIdWithUser(postId);

    if (!existingPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Post not found");
    }

    await this.setPostRetrievalEligibility(postId, false);

    const updatedPost = await this._tripTalesRepository.updatePostStatus(postId, "BLOCKED");

    if (!updatedPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Post not found");
    }
  }

  async unblockPost(postId: string): Promise<void> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
    }

    const existingPost = await this._postRepository.findByIdWithUser(postId);

    if (!existingPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Post not found");
    }

    await this.setPostRetrievalEligibility(postId, true);

    const updatedPost = await this._tripTalesRepository.updatePostStatus(postId, "PUBLISHED");

    if (!updatedPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Post not found");
    }
  }

  private async setPostRetrievalEligibility(postId: string, isRetrievable: boolean): Promise<void> {
    const document = await this._knowledgeDocumentRepository.findBySource("TRIP_TALES", postId);

    // A post may not have been ingested yet.
    if (!document) {
      return;
    }

    await this._knowledgeChunkRepository.setRetrievableByDocumentId(
      document._id as Types.ObjectId,
      isRetrievable,
    );
  }
}
