import {
  IComment,
  IPopulatedComment,
} from "@/interfaces/IModel/trip-tales/comments.model.interface";

export interface ICommentsRepository {
  createComment(
    postId: string,
    userId: string,
    content: string,
    parentCommentId?: string | null,
  ): Promise<IComment>;

  // Fetch paginated top-level comments
  findTopLevelCommentsByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<IPopulatedComment[]>;

  // Fetch all comments and replies belonging to a post
  findAllCommentsByPostId(postId: string): Promise<IPopulatedComment[]>;

  // Fetch a single populated comment
  findPopulatedCommentById(commentId: string): Promise<IPopulatedComment | null>;

  // Counts
  countCommentsByPostId(postId: string): Promise<number>;
  countTopLevelCommentsByPostId(postId: string): Promise<number>;
  countCommentsByPostIds(postIds: string[]): Promise<Map<string, number>>;

  // Update
  updateComment(commentId: string, userId: string, content: string): Promise<IComment | null>;

  findCommentById(commentId: string): Promise<IComment | null>;

  findChildComments(parentCommentIds: string[]): Promise<IComment[]>;

  // Delete
  deleteCommentsByIds(commentIds: string[]): Promise<void>;

  deleteComment(commentId: string, userId: string): Promise<IComment | null>;

  deleteCommentsByPostId(postId: string): Promise<void>;
}
