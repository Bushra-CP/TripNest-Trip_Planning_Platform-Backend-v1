import { inject, injectable } from "inversify";
import { Types } from "mongoose";

import { TYPES } from "@/di/types";

import { ICommentsRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/comments.repository.interface";
import { ICommentsService } from "@/interfaces/IServices/user(traveler)/trip-tales/comments.service.interface";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";

import {
  CommentResponseDto,
  CommentsResponseDto,
} from "@/dtos/user(traveler)/trip-tales/comments.dto";

import { IPopulatedComment } from "@/interfaces/IModel/trip-tales/comments.model.interface";

import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";

import { CommentMapper } from "@/mapper/comment.mapper";

@injectable()
export class CommentsService implements ICommentsService {
  constructor(
    @inject(TYPES.CommentsRepository)
    private readonly _commentsRepository: ICommentsRepository,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,
  ) {}

  // Validate whether the post exists and is published
  private async validatePublishedPost(postId: string): Promise<void> {
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
    }

    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post || post.status !== "PUBLISHED") {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Published post not found");
    }
  }

  // Validate comment content
  private validateContent(content: string): string {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Comment cannot be empty");
    }

    if (trimmedContent.length > 1000) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Comment cannot exceed 1000 characters");
    }

    return trimmedContent;
  }

  // Create a normal comment
  async createComment(
    postId: string,
    userId: string,
    content: string,
  ): Promise<CommentResponseDto> {
    await this.validatePublishedPost(postId);

    const trimmedContent = this.validateContent(content);

    const comment = await this._commentsRepository.createComment(postId, userId, trimmedContent);

    const populatedComment = await this._commentsRepository.findPopulatedCommentById(
      comment._id.toString(),
    );

    if (!populatedComment) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, "Failed to retrieve created comment");
    }

    return CommentMapper.toCommentResponse(populatedComment);
  }

  // Create a reply to a comment or another reply
  async createReply(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<CommentResponseDto> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
    }

    // Find the parent comment
    const parentComment = await this._commentsRepository.findCommentById(commentId);

    if (!parentComment) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Parent comment not found");
    }

    const postId = parentComment.postId.toString();

    // Ensure the parent belongs to a published post
    await this.validatePublishedPost(postId);

    const trimmedContent = this.validateContent(content);

    // Create the reply
    const reply = await this._commentsRepository.createComment(
      postId,
      userId,
      trimmedContent,
      commentId,
    );

    // Retrieve the reply with populated user information
    const populatedReply = await this._commentsRepository.findPopulatedCommentById(
      reply._id.toString(),
    );

    if (!populatedReply) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, "Failed to retrieve created reply");
    }

    return CommentMapper.toCommentResponse(populatedReply);
  }

  // Build nested comment structure
  private buildCommentTree(
    comments: IPopulatedComment[],
    topLevelComments: IPopulatedComment[],
  ): CommentResponseDto[] {
    const commentMap = new Map<string, CommentResponseDto>();

    // Step 1: Convert all comments into DTOs
    for (const comment of comments) {
      const mappedComment = CommentMapper.toCommentResponse(comment);

      commentMap.set(mappedComment.id, mappedComment);
    }

    // Step 2: Attach each reply to its parent
    for (const comment of comments) {
      if (!comment.parentCommentId) {
        continue;
      }

      const parentId = comment.parentCommentId.toString();

      const parent = commentMap.get(parentId);

      const child = commentMap.get(comment._id.toString());

      if (parent && child) {
        parent.replies.push(child);

        // Count only direct replies
        parent.repliesCount++;
      }
    }

    // Step 3: Return only top-level comments
    return topLevelComments
      .map((comment) => commentMap.get(comment._id.toString()))
      .filter((comment): comment is CommentResponseDto => !!comment);
  }

  // Get comments with nested replies and pagination
  async getComments(postId: string, page: number, limit: number): Promise<CommentsResponseDto> {
    await this.validatePublishedPost(postId);

    // Fetch top-level comments, all comments and total root count
    const [topLevelComments, allComments, totalComments] = await Promise.all([
      this._commentsRepository.findTopLevelCommentsByPostId(postId, page, limit),

      this._commentsRepository.findAllCommentsByPostId(postId),

      this._commentsRepository.countTopLevelCommentsByPostId(postId),
    ]);

    // Build the nested comment tree
    const nestedComments = this.buildCommentTree(allComments, topLevelComments);

    const totalPages = Math.ceil(totalComments / limit);

    return {
      comments: nestedComments,

      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // Update an existing comment or reply
  async updateComment(
    commentId: string,
    userId: string,
    content: string,
  ): Promise<CommentResponseDto> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
    }

    const trimmedContent = this.validateContent(content);

    // Update only if the comment belongs to the requesting user
    const updatedComment = await this._commentsRepository.updateComment(
      commentId,
      userId,
      trimmedContent,
    );

    if (!updatedComment) {
      throw new AppError(
        STATUS_CODES.NOT_FOUND,
        "Comment not found or you are not authorized to edit it",
      );
    }

    // Retrieve the updated comment with populated user information
    const populatedComment = await this._commentsRepository.findPopulatedCommentById(commentId);

    if (!populatedComment) {
      throw new AppError(STATUS_CODES.INTERNAL_SERVER_ERROR, "Failed to retrieve updated comment");
    }

    return CommentMapper.toCommentResponse(populatedComment);
  }

  // Delete a comment and all its nested replies
  async deleteComment(commentId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
    }

    // Step 1: Find the comment without deleting it
    const comment = await this._commentsRepository.findCommentById(commentId);

    // Step 2: Verify ownership
    if (!comment || comment.userId.toString() !== userId) {
      throw new AppError(
        STATUS_CODES.NOT_FOUND,
        "Comment not found or you are not authorized to delete it",
      );
    }

    // Step 3: Start collecting IDs with the parent comment
    const commentIdsToDelete = [commentId];

    let parentIds = [commentId];

    // Step 4: Find all nested replies level by level
    while (parentIds.length > 0) {
      const children = await this._commentsRepository.findChildComments(parentIds);

      const childIds = children.map((child) => child._id.toString());

      commentIdsToDelete.push(...childIds);

      // Search for the next level of replies
      parentIds = childIds;
    }

    // Step 5: Delete the parent and all its descendants
    await this._commentsRepository.deleteCommentsByIds(commentIdsToDelete);
  }

  // Existing PostService integration: get comment counts
  async getCommentCounts(postIds: string[]): Promise<Map<string, number>> {
    return this._commentsRepository.countCommentsByPostIds(postIds);
  }

  // Existing PostService integration: delete comments by post
  async deleteCommentsByPostId(postId: string): Promise<void> {
    await this._commentsRepository.deleteCommentsByPostId(postId);
  }
}
