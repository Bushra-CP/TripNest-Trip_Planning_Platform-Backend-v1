import {
  LikeActionResponseDto,
  PostLikesResponseDto,
  PostLikeStatsDto,
} from "@/dtos/user(traveler)/trip-tales/likes.dto";

export interface ILikesService {
  likePost(postId: string, userId: string): Promise<LikeActionResponseDto>;

  unlikePost(postId: string, userId: string): Promise<LikeActionResponseDto>;

  getPostLikes(postId: string, page: number, limit: number): Promise<PostLikesResponseDto>;

  getPostLikeStats(postIds: string[], userId?: string): Promise<Map<string, PostLikeStatsDto>>;

  deleteLikesByPostId(postId: string): Promise<void>;
}
