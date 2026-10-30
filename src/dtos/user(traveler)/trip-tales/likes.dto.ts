export interface TripTalesLikeUserDto {
  userId: string;
  fullName: string;
  profileImageUrl: string;
  likedAt: Date;
}

export interface PostLikeStatsDto {
  postId: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
}

export interface PostLikesResponseDto {
  postId: string;
  likesCount: number;
  likes: TripTalesLikeUserDto[];

  pagination: {
    currentPage: number;
    totalPages: number;
    totalLikes: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface LikeActionResponseDto {
  postId: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
}
