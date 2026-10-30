import type {
  IPopulatedPost,
  IPost,
  PostStatus,
} from "@/interfaces/IModel/trip-tales/posts.model.interface";

import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface ITripTalesRepository extends IBaseRepository<IPost> {
  findPosts(
    page: number,
    limit: number,
    search?: string,
    status?: PostStatus,
    sort?: "newest" | "oldest",
  ): Promise<IPopulatedPost[]>;

  countPosts(search?: string, status?: PostStatus): Promise<number>;

  countPostsByStatus(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    blockedPosts: number;
  }>;

  updatePostStatus(postId: string, status: PostStatus): Promise<IPost | null>;
}
