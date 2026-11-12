import type { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { AdminPostReportsQueryDto } from "@/dtos/admin/trip-tales/admin-post-reports.dto";
import {
  PostReportReason,
  PostReportStatus,
} from "@/interfaces/IModel/trip-tales/post-report.model.interface";
import { AppError } from "@/shared/errors/app.error";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IAdminPostReportsService } from "@/interfaces/IServices/admin/trip-tales/admin-post-reports.service.interface";

@injectable()
export class AdminPostReportsController {
  constructor(
    @inject(TYPES.AdminPostReportsService)
    private readonly _adminPostReportsService: IAdminPostReportsService,
  ) {}

  // GET ALL REPORTS WITH FILTERS AND PAGINATION
  public getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        page: pageValue,
        limit: limitValue,
        search: searchValue,
        status: statusValue,
        reason: reasonValue,
        sort: sortValue,
      } = req.query;

      // Reject repeated query parameters.
      if (
        Array.isArray(pageValue) ||
        Array.isArray(limitValue) ||
        Array.isArray(searchValue) ||
        Array.isArray(statusValue) ||
        Array.isArray(reasonValue) ||
        Array.isArray(sortValue)
      ) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid query parameters");
      }

      // Validate page.
      const page = pageValue === undefined ? 1 : Number(pageValue);

      if (!Number.isInteger(page) || page < 1) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Page must be a positive integer");
      }

      // Validate limit.
      const limit = limitValue === undefined ? 10 : Number(limitValue);

      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 100");
      }

      // Validate search.
      if (searchValue !== undefined && typeof searchValue !== "string") {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Search must be a string");
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
        if (
          typeof statusValue !== "string" ||
          !allowedStatuses.includes(statusValue as PostReportStatus)
        ) {
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
        if (
          typeof reasonValue !== "string" ||
          !allowedReasons.includes(reasonValue as PostReportReason)
        ) {
          throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report reason");
        }

        reason = reasonValue as PostReportReason;
      }

      // Prepare query.
      const query: AdminPostReportsQueryDto = {
        page,
        limit,
        sort,
        ...(searchValue?.trim() && {
          search: searchValue.trim(),
        }),
        ...(status && { status }),
        ...(reason && { reason }),
      };

      const data = await this._adminPostReportsService.getReports(query);

      ResponseHandler.success(res, STATUS_CODES.OK, "Post reports fetched successfully", data);
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

      const data = await this._adminPostReportsService.getReportById(reportId);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        "Post report details fetched successfully",
        data,
      );
    } catch (error) {
      next(error);
    }
  };

  // GET REPORT STATISTICS
  public getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this._adminPostReportsService.getStats();

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        "Post report statistics fetched successfully",
        data,
      );
    } catch (error) {
      next(error);
    }
  };

  // UPDATE REPORT STATUS
  public updateReportStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reportId = req.params.reportId;

      if (typeof reportId !== "string" || !reportId.trim()) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report ID");
      }

      const { status } = req.body;

      const allowedStatuses: PostReportStatus[] = ["REVIEWED", "RESOLVED", "REJECTED"];

      if (typeof status !== "string" || !allowedStatuses.includes(status as PostReportStatus)) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report status");
      }

      const data = await this._adminPostReportsService.updateReportStatus(
        reportId,
        status as PostReportStatus,
      );

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        "Post report status updated successfully",
        data,
      );
    } catch (error) {
      next(error);
    }
  };
}
