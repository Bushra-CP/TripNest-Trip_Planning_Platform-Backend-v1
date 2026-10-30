import { IPopulatedTripTalesLike } from "@/interfaces/IModel/trip-tales/trip-tales-like.model.interface";

export interface ILikeCount {
  postId: string;
  count: number;
}

export interface ILikesRepository {
  addLike(postId: string, userId: string): Promise<void>;

  removeLike(postId: string, userId: string): Promise<void>;

  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;

  countLikes(postId: string): Promise<number>;

  countLikesForPosts(postIds: string[]): Promise<ILikeCount[]>;

  findLikedPostIds(postIds: string[], userId: string): Promise<string[]>;

  findLikesByPost(postId: string, page: number, limit: number): Promise<IPopulatedTripTalesLike[]>;

  deleteLikesByPostId(postId: string): Promise<void>;
}
