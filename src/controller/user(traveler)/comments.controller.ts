import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { ICommentsService } from "@/interfaces/IServices/user(traveler)/trip-tales/comments.service.interface";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ResponseHandler } from "@/shared/http/responseHandler";

@injectable()
export class CommentsController {
  constructor(
    @inject(TYPES.CommentsService)
    private readonly _commentsService: ICommentsService,
  ) {}

  // Create a normal comment
  public createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { postId } = req.params;
      const { content } = req.body;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      if (typeof content !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Comment content is required");
      }

      const data = await this._commentsService.createComment(postId, req.user.userId, content);

      ResponseHandler.success(res, STATUS_CODES.CREATED, "Comment added successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // Create a reply to a comment or another reply
  public createReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;

      if (typeof commentId !== "string" || !Types.ObjectId.isValid(commentId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
      }

      if (typeof content !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Reply content is required");
      }

      const data = await this._commentsService.createReply(commentId, req.user.userId, content);

      ResponseHandler.success(res, STATUS_CODES.CREATED, "Reply added successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // Get comments with nested replies
  public getComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { postId } = req.params;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      const pageValue = req.query.page;
      const limitValue = req.query.limit;

      if (Array.isArray(pageValue) || Array.isArray(limitValue)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid pagination parameters");
      }

      const page = pageValue === undefined ? 1 : Number(pageValue);
      const limit = limitValue === undefined ? 10 : Number(limitValue);

      if (!Number.isInteger(page) || page < 1) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Page must be a positive integer");
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 50");
      }

      const data = await this._commentsService.getComments(postId, page, limit);

      ResponseHandler.success(res, STATUS_CODES.OK, "Comments fetched successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // Update an existing comment or reply
  public updateComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;

      if (typeof commentId !== "string" || !Types.ObjectId.isValid(commentId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
      }

      if (typeof content !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Comment content is required");
      }

      const data = await this._commentsService.updateComment(commentId, req.user.userId, content);

      ResponseHandler.success(res, STATUS_CODES.OK, "Comment updated successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // Delete a comment and all its nested replies
  public deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params;

      if (typeof commentId !== "string" || !Types.ObjectId.isValid(commentId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid comment ID");
      }

      await this._commentsService.deleteComment(commentId, req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Comment deleted successfully");
    } catch (error) {
      next(error);
    }
  };
}
