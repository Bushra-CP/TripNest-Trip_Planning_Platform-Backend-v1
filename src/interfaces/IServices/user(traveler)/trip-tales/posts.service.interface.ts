import { MyPostsQueryDto, MyPostsResponseDto } from "@/dtos/user(traveler)/trip-tales/my-posts.dto";
import {
  CreatePostRequestDto,
  CreatePostResponseDto,
} from "@/dtos/user(traveler)/trip-tales/trip-tales.dto";
import {
  MyPostDetailsResponseDto,
  UpdateMyPostDto,
} from "@/dtos/user(traveler)/trip-tales/update-my-posts.dto";

export interface IPostService {
  createPost(
    userId: string,
    payload: CreatePostRequestDto,
    files: Express.Multer.File[],
  ): Promise<CreatePostResponseDto>;

  getPosts(): Promise<CreatePostResponseDto[]>;

  getPostById(postId: string): Promise<CreatePostResponseDto | null>;

  getMyPosts(userId: string, query: MyPostsQueryDto): Promise<MyPostsResponseDto>;

  getMyPostById(postId: string, userId: string): Promise<MyPostDetailsResponseDto | null>;

  updateMyPost(
    postId: string,
    userId: string,
    payload: UpdateMyPostDto,
    files: Express.Multer.File[],
  ): Promise<MyPostDetailsResponseDto>;

  deleteMyPost(postId: string, userId: string): Promise<void>;
}
