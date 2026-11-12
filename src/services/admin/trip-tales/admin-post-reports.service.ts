import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { IAdminPostReportsRepository } from "@/interfaces/IRepository/admin/trip-tales/admin-post-reports.repository.interface";
import {
  AdminPostReportDto,
  AdminPostReportsQueryDto,
  AdminPostReportsStatsDto,
  PaginatedAdminPostReportsResponseDto,
} from "@/dtos/admin/trip-tales/admin-post-reports.dto";
import { PostReportStatus } from "@/interfaces/IModel/trip-tales/post-report.model.interface";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IAdminPostReportsService } from "@/interfaces/IServices/admin/trip-tales/admin-post-reports.service.interface";

@injectable()
export class AdminPostReportsService implements IAdminPostReportsService {
  constructor(
    @inject(TYPES.AdminPostReportsRepository)
    private readonly _adminPostReportsRepository: IAdminPostReportsRepository,
  ) {}

  // Validate report ID.
  private validateReportId(reportId: string): void {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report ID");
    }
  }

  // Get all reports with filters and pagination.
  async getReports(query: AdminPostReportsQueryDto): Promise<PaginatedAdminPostReportsResponseDto> {
    const page = query.page ?? 1;

    const limit = query.limit ?? 10;

    const sort = query.sort ?? "newest";

    // Validate page number.
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid page number");
    }

    // Validate limit.
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 100");
    }

    // Validate sorting.
    if (sort !== "newest" && sort !== "oldest") {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Sort must be either newest or oldest");
    }

    const filters: AdminPostReportsQueryDto = {
      ...query,
      page,
      limit,
      sort,
      ...(query.search?.trim() && {
        search: query.search.trim(),
      }),
    };

    // Fetch reports and total count simultaneously.
    const [reports, totalReports] = await Promise.all([
      this._adminPostReportsRepository.findReports(filters),

      this._adminPostReportsRepository.countReports(filters),
    ]);

    const totalPages = Math.ceil(totalReports / limit);

    return {
      reports,

      pagination: {
        currentPage: page,
        limit,
        totalReports,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    };
  }

  // Get one report with complete details.
  async getReportById(reportId: string): Promise<AdminPostReportDto> {
    this.validateReportId(reportId);

    const report = await this._adminPostReportsRepository.findReportById(reportId);

    if (!report) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Report not found");
    }

    return report;
  }

  // Get report statistics.
  async getStats(): Promise<AdminPostReportsStatsDto> {
    return this._adminPostReportsRepository.countReportsByStatus();
  }

  // Update report status.
  async updateReportStatus(
    reportId: string,
    newStatus: PostReportStatus,
  ): Promise<AdminPostReportDto> {
    this.validateReportId(reportId);

    // Find the existing report.
    const existingReport = await this._adminPostReportsRepository.findById(reportId);

    if (!existingReport) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Report not found");
    }

    const currentStatus = existingReport.status;

    // Define allowed status transitions.
    const allowedTransitions: Record<PostReportStatus, PostReportStatus[]> = {
      PENDING: ["REVIEWED", "RESOLVED", "REJECTED"],

      REVIEWED: ["RESOLVED", "REJECTED"],

      RESOLVED: [],

      REJECTED: [],
    };

    // Check whether the requested transition is allowed.
    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new AppError(
        STATUS_CODES.BAD_REQUEST,
        `Cannot change report status from ${currentStatus} to ${newStatus}`,
      );
    }

    // Prepare update data.
    const updateData: {
      status: PostReportStatus;
      reviewedAt?: Date;
    } = {
      status: newStatus,
    };

    // Set reviewedAt when the report is first reviewed.
    if (!existingReport.reviewedAt) {
      updateData.reviewedAt = new Date();
    }

    // Update the report.
    const updatedReport = await this._adminPostReportsRepository.updateById(reportId, {
      $set: updateData,
    });

    if (!updatedReport) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Unable to update report status");
    }

    // Return updated report details.
    return this.getReportById(reportId);
  }
}
