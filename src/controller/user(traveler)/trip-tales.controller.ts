import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IPostService } from "@/interfaces/IServices/user(traveler)/trip-tales/posts.service.interface";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { AppError } from "@/shared/errors/app.error";
import { PostStatus } from "@/interfaces/IModel/trip-tales/posts.model.interface";
import { MyPostsQueryDto } from "@/dtos/user(traveler)/trip-tales/my-posts.dto";
import { PostSortOption } from "@/dtos/user(traveler)/trip-tales/my-posts.dto";
import { Types } from "mongoose";
import { UpdateMyPostDto } from "@/dtos/user(traveler)/trip-tales/update-my-posts.dto";
import { ILikesService } from "@/interfaces/IServices/user(traveler)/trip-tales/likes.service.interface";

@injectable()
export class TripTalesController {
  constructor(
    @inject(TYPES.PostService)
    private readonly _postService: IPostService,

    @inject(TYPES.LikesService)
    private readonly _likesService: ILikesService,
  ) {}

  /**
   * CREATE POST
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*}  {Promise<void>}
   * @memberof PostController
   */
  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];

      const data = await this._postService.createPost(req.user.userId, req.body, files);

      ResponseHandler.success(res, STATUS_CODES.CREATED, SuccessMessages.POST_CREATED, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET POSTS
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*}  {Promise<void>}
   * @memberof TripTalesController
   */
  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this._postService.getPosts(req.user?.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Posts fetched successfully", data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET POST BY ID
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*}  {Promise<void>}
   * @memberof TripTalesController
   */
  async getPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { postId } = req.params;

      // console.log(postId);

      if (!postId || Array.isArray(postId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_POST_ID);
        return;
      }

      const data = await this._postService.getPostById(postId, req.user?.userId);

      // console.log(data);

      if (!data) {
        ResponseHandler.error(res, STATUS_CODES.NOT_FOUND, "Post not found");
        return;
      }

      ResponseHandler.success(res, STATUS_CODES.OK, "Post fetched successfully", data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET MY POSTS
   * Fetch posts belonging to the authenticated traveler
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @return {*}  {Promise<void>}
   * @memberof TripTalesController
   */
  async getMyPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pageValue = req.query.page;
      const limitValue = req.query.limit;
      const searchValue = req.query.search;
      if (searchValue !== undefined && typeof searchValue !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Search must be a string");
      }

      const sortValue = req.query.sort;
      const statusValue = req.query.status;

      // Reject repeated query parameters.
      if (
        Array.isArray(pageValue) ||
        Array.isArray(limitValue) ||
        Array.isArray(searchValue) ||
        Array.isArray(sortValue) ||
        Array.isArray(statusValue)
      ) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid query parameters");
      }

      const page = pageValue === undefined ? 1 : Number(pageValue);

      const limit = limitValue === undefined ? 10 : Number(limitValue);

      if (!Number.isInteger(page) || page < 1) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Page must be a positive integer");
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 50");
      }

      const sort: PostSortOption =
        sortValue === undefined ? "newest" : (sortValue as PostSortOption);

      if (sort !== "newest" && sort !== "oldest") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Sort must be either newest or oldest");
      }

      let status: PostStatus | undefined;

      if (statusValue !== undefined) {
        if (statusValue !== "PUBLISHED" && statusValue !== "BLOCKED") {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post status");
        }

        status = statusValue;
      }

      const query: MyPostsQueryDto = {
        page,
        limit,
        search: searchValue?.trim(),
        sort,
        status,
      };

      const data = await this._postService.getMyPosts(req.user.userId, query);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        "Your TripTales posts fetched successfully",
        data,
      );
    } catch (error) {
      next(error);
    }
  }

  public getMyPostById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = req.params.postId;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      const post = await this._postService.getMyPostById(postId, req.user.userId);

      if (!post) {
        throw new AppError(STATUS_CODES.NOT_FOUND, "TripTales post not found");
      }

      res.status(STATUS_CODES.OK).json({
        success: true,
        message: "TripTales post fetched successfully",
        data: post,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMyPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = req.params.postId;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      let keepMediaKeys: string[] | undefined;

      if (req.body.keepMediaKeys !== undefined) {
        const value = req.body.keepMediaKeys;

        if (typeof value === "string") {
          try {
            keepMediaKeys = JSON.parse(value);
          } catch {
            throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid keepMediaKeys format");
          }
        } else {
          keepMediaKeys = value;
        }

        if (
          !Array.isArray(keepMediaKeys) ||
          !keepMediaKeys.every((key) => typeof key === "string")
        ) {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "keepMediaKeys must be an array of strings");
        }
      }

      const payload: UpdateMyPostDto = {};

      if (req.body.title !== undefined) {
        if (typeof req.body.title !== "string") {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Title must be a string");
        }

        payload.title = req.body.title;
      }

      if (req.body.destination !== undefined) {
        if (typeof req.body.destination !== "string") {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Destination must be a string");
        }

        payload.destination = req.body.destination;
      }

      if (req.body.content !== undefined) {
        if (typeof req.body.content !== "string") {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Content must be a string");
        }

        payload.content = req.body.content;
      }

      if (req.body.tags !== undefined) {
        let tags = req.body.tags;

        if (typeof tags === "string") {
          try {
            tags = JSON.parse(tags);
          } catch {
            throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid tags format");
          }
        }

        if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Tags must be an array of strings");
        }

        payload.tags = tags;
      }

      if (keepMediaKeys !== undefined) {
        payload.keepMediaKeys = keepMediaKeys;
      }

      const files = (req.files as Express.Multer.File[]) ?? [];

      const updatedPost = await this._postService.updateMyPost(
        postId,
        req.user.userId,
        payload,
        files,
      );

      res.status(STATUS_CODES.OK).json({
        success: true,
        message: "TripTales post updated successfully",
        data: updatedPost,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteMyPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = req.params.postId;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      await this._postService.deleteMyPost(postId, req.user.userId);

      res.status(STATUS_CODES.OK).json({
        success: true,
        message: "TripTales post deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * LIKE A POST
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof TripTalesController
   */
  public likePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { postId } = req.params;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      const data = await this._likesService.likePost(postId, req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Post liked successfully", data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * UNLIKE A POST
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof TripTalesController
   */
  public unlikePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { postId } = req.params;

      if (typeof postId !== "string" || !Types.ObjectId.isValid(postId)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      const data = await this._likesService.unlikePost(postId, req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Post unliked successfully", data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET USERS WHO LIKED A POST
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof TripTalesController
   */
  public getPostLikes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const data = await this._likesService.getPostLikes(postId, page, limit);

      ResponseHandler.success(res, STATUS_CODES.OK, "Post likes fetched successfully", data);
    } catch (error) {
      next(error);
    }
  };
}
