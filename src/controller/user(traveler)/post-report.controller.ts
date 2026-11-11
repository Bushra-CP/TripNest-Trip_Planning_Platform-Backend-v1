import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { IPostReportService } from "@/interfaces/IServices/user(traveler)/trip-tales/post-report.service.interface";
import { MyReportsFilter } from "@/interfaces/IRepository/user(traveler)/trip-tales/post-report.repository.interface";
import {
  PostReportReason,
  PostReportStatus,
} from "@/interfaces/IModel/trip-tales/post-report.model.interface";
import { AppError } from "@/shared/errors/app.error";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";

@injectable()
export class PostReportController {
  constructor(
    @inject(TYPES.PostReportService)
    private readonly _postReportService: IPostReportService,
  ) {}

  // CREATE POST REPORT
  public createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const postId = req.params.postId;

      if (typeof postId !== "string" || !postId.trim()) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
      }

      const { reason, description } = req.body;

      if (typeof reason !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Report reason is required");
      }

      if (description !== undefined && typeof description !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Description must be a string");
      }

      const data = await this._postReportService.createReport(postId, req.user.userId, {
        reason: reason as PostReportReason,
        description,
      });

      ResponseHandler.success(res, STATUS_CODES.CREATED, "Post reported successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // GET MY REPORTS WITH FILTERS AND PAGINATION
  public getMyReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page: pageValue,
        limit: limitValue,
        status: statusValue,
        reason: reasonValue,
        search: searchValue,
        sort: sortValue,
      } = req.query;

      // Reject repeated query parameters.
      if (
        Array.isArray(pageValue) ||
        Array.isArray(limitValue) ||
        Array.isArray(statusValue) ||
        Array.isArray(reasonValue) ||
        Array.isArray(searchValue) ||
        Array.isArray(sortValue)
      ) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid query parameters");
      }

      // Validate search.
      if (searchValue !== undefined && typeof searchValue !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Search must be a string");
      }

      const page = pageValue === undefined ? 1 : Number(pageValue);
      const limit = limitValue === undefined ? 10 : Number(limitValue);

      if (!Number.isInteger(page) || page < 1) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Page must be a positive integer");
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 50");
      }

      // Validate sorting.
      const sort = sortValue === undefined ? "newest" : sortValue;

      if (sort !== "newest" && sort !== "oldest") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Sort must be either newest or oldest");
      }

      // Validate report status.
      const allowedStatuses: PostReportStatus[] = ["PENDING", "REVIEWED", "RESOLVED", "REJECTED"];

      let status: PostReportStatus | undefined;

      if (statusValue !== undefined) {
        if (!allowedStatuses.includes(statusValue as PostReportStatus)) {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report status");
        }

        status = statusValue as PostReportStatus;
      }

      // Validate report reason.
      const allowedReasons: PostReportReason[] = [
        "SPAM",
        "INAPPROPRIATE_CONTENT",
        "HARASSMENT",
        "HATE_SPEECH",
        "FALSE_INFORMATION",
        "COPYRIGHT_VIOLATION",
        "OTHER",
      ];

      let reason: PostReportReason | undefined;

      if (reasonValue !== undefined) {
        if (!allowedReasons.includes(reasonValue as PostReportReason)) {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report reason");
        }

        reason = reasonValue as PostReportReason;
      }

      const filters: MyReportsFilter = {
        page,
        limit,
        sort,
        ...(status && { status }),
        ...(reason && { reason }),
        ...(searchValue?.trim() && { search: searchValue.trim() }),
      };

      const data = await this._postReportService.getMyReports(req.user.userId, filters);

      ResponseHandler.success(res, STATUS_CODES.OK, "Your reports fetched successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // GET SINGLE REPORT DETAILS
  public getReportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reportId = req.params.reportId;

      if (typeof reportId !== "string" || !reportId.trim()) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report ID");
      }

      const data = await this._postReportService.getReportById(reportId, req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Report details fetched successfully", data);
    } catch (error) {
      next(error);
    }
  };

  // CANCEL REPORT
  public cancelReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reportId = req.params.reportId;

      if (typeof reportId !== "string" || !reportId.trim()) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report ID");
      }

      await this._postReportService.cancelReport(reportId, req.user.userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Report cancelled successfully");
    } catch (error) {
      next(error);
    }
  };
}
