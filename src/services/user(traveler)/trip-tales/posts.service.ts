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

@injectable()
export class PostService implements IPostService {
  constructor(
    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,

    @inject(TYPES.S3Service)
    private readonly _s3Service: IS3Service,

    @inject(TYPES.TripTalesRagService)
    private readonly _tripTalesRagService: TripTalesRagService,
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
  async getPosts(): Promise<CreatePostResponseDto[]> {
    const posts = await this._postRepository.findAllWithUser();

    return posts.map((post) => TripTalesPostMapper.toPostResponse(post));
  }

  /**
   * GET POST BY ID
   *
   * @param {string} postId
   * @return {*}  {(Promise<CreatePostResponseDto | null>)}
   * @memberof PostService
   */
  async getPostById(postId: string): Promise<CreatePostResponseDto | null> {
    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post) {
      return null;
    }

    return TripTalesPostMapper.toPostResponse(post);
  }
}
