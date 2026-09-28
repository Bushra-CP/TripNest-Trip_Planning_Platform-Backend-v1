import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IPostService } from "@/interfaces/IServices/user(traveler)/trip-tales/posts.service.interface";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";

@injectable()
export class TripTalesController {
  constructor(
    @inject(TYPES.PostService)
    private readonly _postService: IPostService,
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
      const data = await this._postService.getPosts();

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

      console.log(postId);

      if (!postId || Array.isArray(postId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_POST_ID);
        return;
      }

      const data = await this._postService.getPostById(postId);

      console.log(data);

      if (!data) {
        ResponseHandler.error(res, STATUS_CODES.NOT_FOUND, "Post not found");
        return;
      }

      ResponseHandler.success(res, STATUS_CODES.OK, "Post fetched successfully", data);
    } catch (error) {
      next(error);
    }
  }
}
