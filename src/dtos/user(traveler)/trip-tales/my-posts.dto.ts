import { PostStatus } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { CreatePostResponseDto } from "./trip-tales.dto";

export type PostSortOption = "newest" | "oldest";

export interface MyPostsQueryDto {
  page: number;
  limit: number;
  search?: string | undefined;
  sort: PostSortOption;
  status?: PostStatus | undefined;
}

export interface MyPostResponseDto extends CreatePostResponseDto {
  status: PostStatus;
  updatedAt: Date;
}

export interface MyPostsResponseDto {
  posts: MyPostResponseDto[];

  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
