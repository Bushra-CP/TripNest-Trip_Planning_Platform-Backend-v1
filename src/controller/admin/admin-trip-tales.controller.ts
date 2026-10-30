import type { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { IAdminTripTalesService } from "@/interfaces/IServices/admin/admin-trip-tales.service.interface";
import { AdminTripTalesQueryDto } from "@/dtos/admin/trip-tales/admin-trip-tales.dto";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";

@injectable()
export class AdminTripTalesController {
  constructor(
    @inject(TYPES.AdminTripTalesService)
    private readonly _adminTripTalesService: IAdminTripTalesService,
  ) {}

  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = this.parsePositiveInteger(req.query.page, 1);
      const limit = this.parsePositiveInteger(req.query.limit, 10);

      const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

      const status = typeof req.query.status === "string" ? req.query.status : undefined;

      const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;

      const query: AdminTripTalesQueryDto = {
        page,
        limit,
        search,
        status: status as AdminTripTalesQueryDto["status"],
        sort: sort as AdminTripTalesQueryDto["sort"],
      };

      const data = await this._adminTripTalesService.getPosts(query);

      ResponseHandler.success(res, STATUS_CODES.OK, "TripTales posts fetched successfully", data);
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = req.params.postId;

      if (!postId || Array.isArray(postId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "Invalid post ID");
        return;
      }

      const data = await this._adminTripTalesService.getPostById(postId);

      if (!data) {
        ResponseHandler.error(res, STATUS_CODES.NOT_FOUND, "Post not found");
        return;
      }

      ResponseHandler.success(res, STATUS_CODES.OK, "TripTales post fetched successfully", data);
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this._adminTripTalesService.getStats();

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        "TripTales statistics fetched successfully",
        data,
      );
    } catch (error) {
      next(error);
    }
  }

  async blockPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = req.params.postId;

      if (!postId || Array.isArray(postId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "Invalid post ID");
        return;
      }

      await this._adminTripTalesService.blockPost(postId);

      ResponseHandler.success(res, STATUS_CODES.OK, "TripTales post blocked successfully", {
        postId,
        status: "BLOCKED",
      });
    } catch (error) {
      next(error);
    }
  }

  async unblockPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = req.params.postId;

      if (!postId || Array.isArray(postId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "Invalid post ID");
        return;
      }

      await this._adminTripTalesService.unblockPost(postId);

      ResponseHandler.success(res, STATUS_CODES.OK, "TripTales post unblocked successfully", {
        postId,
        status: "PUBLISHED",
      });
    } catch (error) {
      next(error);
    }
  }

  private parsePositiveInteger(value: unknown, defaultValue: number): number {
    if (typeof value !== "string") {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
      return defaultValue;
    }

    return parsed;
  }
}
