import {
  CommentResponseDto,
  CommentsResponseDto,
} from "@/dtos/user(traveler)/trip-tales/comments.dto";

export interface ICommentsService {
  // Create a normal comment
  createComment(postId: string, userId: string, content: string): Promise<CommentResponseDto>;

  // Create a reply to any comment or reply
  createReply(commentId: string, userId: string, content: string): Promise<CommentResponseDto>;

  // Get comments with nested replies
  getComments(postId: string, page: number, limit: number): Promise<CommentsResponseDto>;

  // Edit an existing comment or reply
  updateComment(commentId: string, userId: string, content: string): Promise<CommentResponseDto>;

  // Delete a comment and all its nested replies
  deleteComment(commentId: string, userId: string): Promise<void>;

  getCommentCounts(postIds: string[]): Promise<Map<string, number>>;

  deleteCommentsByPostId(postId: string): Promise<void>;
}
