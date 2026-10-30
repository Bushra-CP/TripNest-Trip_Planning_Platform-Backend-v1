import {
  IPopulatedPost,
  IPost,
  PostStatus,
} from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { IBaseRepository } from "../../IBaseRepository";

export interface IPostRepository extends IBaseRepository<IPost> {
  findPublishedWithUser(): Promise<IPopulatedPost[]>;

  findByIdWithUser(postId: string): Promise<IPopulatedPost | null>;

  countByUserId(userId: string): Promise<number>;

  findMyPosts(
    userId: string,
    page: number,
    limit: number,
    search?: string,
    status?: PostStatus,
    sort?: "newest" | "oldest",
  ): Promise<IPopulatedPost[]>;

  countMyPosts(userId: string, search?: string, status?: PostStatus): Promise<number>;

  findMyPostById(postId: string, userId: string): Promise<IPost | null>;

  updateMyPost(postId: string, userId: string, payload: Partial<IPost>): Promise<IPost | null>;

  deleteMyPost(postId: string, userId: string): Promise<IPost | null>;
}
