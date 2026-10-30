import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { MediaFolder } from "@/enums/media.enums";
import { IPostService } from "@/interfaces/IServices/user(traveler)/trip-tales/posts.service.interface";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { IS3Service } from "@/infrastructure/s3/IS3Service";
import {
  CreatePostRequestDto,
  CreatePostResponseDto,
} from "@/dtos/user(traveler)/trip-tales/trip-tales.dto";
import { TripTalesRagService } from "./trip-tales-rag.service";
import { TripTalesPostMapper } from "@/mapper/trip-tales-post.mapper";
import { TripTalesSocket } from "@/socket/tripTales.socket";
import { MyPostsQueryDto, MyPostsResponseDto } from "@/dtos/user(traveler)/trip-tales/my-posts.dto";
import {
  MyPostDetailsResponseDto,
  UpdateMyPostDto,
} from "@/dtos/user(traveler)/trip-tales/update-my-posts.dto";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IPost } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { ILikesService } from "@/interfaces/IServices/user(traveler)/trip-tales/likes.service.interface";

@injectable()
export class PostService implements IPostService {
  constructor(
    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,

    @inject(TYPES.S3Service)
    private readonly _s3Service: IS3Service,

    @inject(TYPES.TripTalesRagService)
    private readonly _tripTalesRagService: TripTalesRagService,

    @inject(TYPES.TripTalesSocket)
    private readonly _tripTalesSocket: TripTalesSocket,

    @inject(TYPES.LikesService)
    private readonly _likesService: ILikesService,
  ) {}

  /**
   * CREATE POST
   *
   * @param {string} userId
   * @param {CreatePostRequestDto} payload
   * @param {Express.Multer.File[]} files
   * @return {*}  {Promise<CreatePostResponseDto>}
   * @memberof PostService
   */
  async createPost(
    userId: string,
    payload: CreatePostRequestDto,
    files: Express.Multer.File[],
  ): Promise<CreatePostResponseDto> {
    const media: {
      key: string;
      url: string;
      type: "image" | "video";
    }[] = [];

    try {
      for (const file of files) {
        const isImage = file.mimetype.startsWith("image/");

        const folder = isImage ? MediaFolder.POST_IMAGES : MediaFolder.VIDEOS;

        const uploadedFile = await this._s3Service.uploadFile(file, folder);

        media.push({
          key: uploadedFile.key,
          url: uploadedFile.url,
          type: isImage ? "image" : "video",
        });
      }

      const post = await this._postRepository.create({
        userId: new Types.ObjectId(userId),
        title: payload.title,
        destination: payload.destination,
        content: payload.content,
        tags: payload.tags,
        media,
      });

      // Add the post to the RAG pipeline.
      try {
        await this._tripTalesRagService.addPostToKnowledge(post);

        this._tripTalesSocket.emitNewPostAvailable(post._id.toString());
      } catch (ragError) {
        console.error("Failed to queue TripTales RAG ingestion:", ragError);
      }

      // Fetch the created post with user information.
      const createdPost = await this._postRepository.findByIdWithUser(post._id.toString());

      if (!createdPost) {
        throw new Error("Failed to fetch created post");
      }

      return TripTalesPostMapper.toPostResponse(createdPost);
    } catch (error) {
      // Delete uploaded files if post creation fails.
      for (const uploadedMedia of media) {
        await this._s3Service.deleteFile(uploadedMedia.key);
      }

      throw error;
    }
  }

  /**
   * GET POSTS
   *
   * @return {*}  {Promise<CreatePostResponseDto[]>}
   * @memberof PostService
   */
  async getPosts(userId?: string): Promise<CreatePostResponseDto[]> {
    const posts = await this._postRepository.findPublishedWithUser();

    const postIds = posts.map((post) => post._id.toString());

    const likeStats = await this._likesService.getPostLikeStats(postIds, userId);

    return posts.map((post) => {
      const stats = likeStats.get(post._id.toString());

      return TripTalesPostMapper.toPostResponse(
        post,
        stats?.likesCount ?? 0,
        stats?.isLikedByCurrentUser ?? false,
      );
    });
  }

  /**
   * GET POST BY ID
   *
   * @param {string} postId
   * @return {*}  {(Promise<CreatePostResponseDto | null>)}
   * @memberof PostService
   */
  async getPostById(postId: string, userId?: string): Promise<CreatePostResponseDto | null> {
    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post || post.status !== "PUBLISHED") {
      return null;
    }

    const likeStats = await this._likesService.getPostLikeStats([postId], userId);

    const stats = likeStats.get(postId);

    return TripTalesPostMapper.toPostResponse(
      post,
      stats?.likesCount ?? 0,
      stats?.isLikedByCurrentUser ?? false,
    );
  }

  /**
   * GET MY POSTS
   *
   * Fetch authenticated user's posts with pagination,
   * search, status filtering and sorting.
   *
   * @param {string} userId
   * @param {MyPostsQueryDto} query
   * @return {*}  {Promise<MyPostsResponseDto>}
   * @memberof PostService
   */
  async getMyPosts(userId: string, query: MyPostsQueryDto): Promise<MyPostsResponseDto> {
    const { page, limit, search, sort, status } = query;

    const [posts, totalPosts] = await Promise.all([
      this._postRepository.findMyPosts(userId, page, limit, search, status, sort),
      this._postRepository.countMyPosts(userId, search, status),
    ]);

    const postIds = posts.map((post) => post._id.toString());

    const likeStats = await this._likesService.getPostLikeStats(postIds, userId);

    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts: posts.map((post) => {
        const stats = likeStats.get(post._id.toString());

        return TripTalesPostMapper.toMyPostResponse(
          post,
          stats?.likesCount ?? 0,
          stats?.isLikedByCurrentUser ?? false,
        );
      }),

      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getMyPostById(postId: string, userId: string): Promise<MyPostDetailsResponseDto | null> {
    const post = await this._postRepository.findMyPostById(postId, userId);

    if (!post) {
      return null;
    }

    const populatedPost = await this._postRepository.findByIdWithUser(postId);

    if (!populatedPost) {
      return null;
    }

    const likeStats = await this._likesService.getPostLikeStats([postId], userId);

    const stats = likeStats.get(postId);

    return TripTalesPostMapper.toMyPostDetailsResponse(
      populatedPost,
      stats?.likesCount ?? 0,
      stats?.isLikedByCurrentUser ?? false,
    );
  }

  async updateMyPost(
    postId: string,
    userId: string,
    payload: UpdateMyPostDto,
    files: Express.Multer.File[],
  ): Promise<MyPostDetailsResponseDto> {
    const existingPost = await this._postRepository.findMyPostById(postId, userId);

    if (!existingPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
    }

    const existingMedia = existingPost.media ?? [];

    // Retain only the existing media selected by the user.
    const keepMediaKeys = payload.keepMediaKeys ?? [];

    const retainedMedia = existingMedia.filter((media) => keepMediaKeys.includes(media.key));

    // Upload newly selected files.
    const uploadedMedia: typeof existingMedia = [];

    try {
      for (const file of files) {
        const isImage = file.mimetype.startsWith("image/");

        const folder = isImage ? MediaFolder.POST_IMAGES : MediaFolder.VIDEOS;

        const uploadedFile = await this._s3Service.uploadFile(file, folder);

        uploadedMedia.push({
          key: uploadedFile.key,
          url: uploadedFile.url,
          type: isImage ? "image" : "video",
        });
      }

      const updatedPayload: Partial<IPost> = {
        media: [...retainedMedia, ...uploadedMedia],
      };

      if (payload.title !== undefined) {
        updatedPayload.title = payload.title;
      }

      if (payload.destination !== undefined) {
        updatedPayload.destination = payload.destination;
      }

      if (payload.content !== undefined) {
        updatedPayload.content = payload.content;
      }

      if (payload.tags !== undefined) {
        updatedPayload.tags = payload.tags;
      }

      const updatedPost = await this._postRepository.updateMyPost(postId, userId, updatedPayload);

      if (!updatedPost) {
        throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
      }

      // Delete media removed by the user.
      const retainedKeys = new Set([...retainedMedia, ...uploadedMedia].map((media) => media.key));

      const removedMedia = existingMedia.filter((media) => !retainedKeys.has(media.key));

      for (const media of removedMedia) {
        try {
          await this._s3Service.deleteFile(media.key);
        } catch (error) {
          console.error(`Failed to delete removed TripTales media: ${media.key}`, error);
        }
      }

      // Update the RAG knowledge document.
      try {
        await this._tripTalesRagService.updatePostKnowledge(updatedPost);
      } catch (ragError) {
        console.error("Failed to queue updated TripTales RAG ingestion:", ragError);
      }

      const populatedPost = await this._postRepository.findByIdWithUser(postId);

      if (!populatedPost) {
        throw new Error("Failed to fetch updated TripTales post");
      }

      const likeStats = await this._likesService.getPostLikeStats([postId], userId);

      const stats = likeStats.get(postId);

      return TripTalesPostMapper.toMyPostDetailsResponse(
        populatedPost,
        stats?.likesCount ?? 0,
        stats?.isLikedByCurrentUser ?? false,
      );
    } catch (error) {
      // Clean up newly uploaded files if the update fails.
      for (const media of uploadedMedia) {
        try {
          await this._s3Service.deleteFile(media.key);
        } catch (cleanupError) {
          console.error(`Failed to clean up uploaded media: ${media.key}`, cleanupError);
        }
      }

      throw error;
    }
  }

  async deleteMyPost(postId: string, userId: string): Promise<void> {
    const existingPost = await this._postRepository.findMyPostById(postId, userId);

    if (!existingPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
    }

    // Delete the post from the database.
    const deletedPost = await this._postRepository.deleteMyPost(postId, userId);

    if (!deletedPost) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
    }

    await this._likesService.deleteLikesByPostId(postId);

    // Remove associated knowledge document and chunks.
    try {
      await this._tripTalesRagService.removePostKnowledge(postId);
    } catch (error) {
      console.error("Failed to remove TripTales RAG knowledge:", error);
    }

    // Delete associated S3 media.
    for (const media of deletedPost.media ?? []) {
      try {
        await this._s3Service.deleteFile(media.key);
      } catch (error) {
        console.error(`Failed to delete TripTales media: ${media.key}`, error);
      }
    }
  }
}
