import {
  CreatePostRequestDto,
  CreatePostResponseDto,
} from "@/dtos/user(traveler)/trip-tales/trip-tales.dto";

export interface IPostService {
  createPost(
    userId: string,
    payload: CreatePostRequestDto,
    files: Express.Multer.File[],
  ): Promise<CreatePostResponseDto>;

  getPosts(): Promise<CreatePostResponseDto[]>;

  getPostById(postId: string): Promise<CreatePostResponseDto | null>;
}
