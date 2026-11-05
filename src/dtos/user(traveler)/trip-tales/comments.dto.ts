export interface CreateCommentDto {
  content: string;
}

export interface CommentResponseDto {
  id: string;
  postId: string;
  parentCommentId: string | null;

  user: {
    id: string;
    fullName: string;
    profileImageUrl: string;
  };

  content: string;

  replies: CommentResponseDto[];
  repliesCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CommentsResponseDto {
  comments: CommentResponseDto[];

  pagination: {
    currentPage: number;
    totalPages: number;
    totalComments: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
