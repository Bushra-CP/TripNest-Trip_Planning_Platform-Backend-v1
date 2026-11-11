import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { IPostRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/posts.repository.interface";
import { IPostReportRepository } from "@/interfaces/IRepository/user(traveler)/trip-tales/post-report.repository.interface";
import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";
import { IPostReportService } from "@/interfaces/IServices/user(traveler)/trip-tales/post-report.service.interface";
import { MyReportsFilter } from "@/interfaces/IRepository/user(traveler)/trip-tales/post-report.repository.interface";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import {
  CreatePostReportDto,
  MyReportsResponseDto,
} from "@/dtos/user(traveler)/trip-tales/post-report.dto";

@injectable()
export class PostReportService implements IPostReportService {
  constructor(
    @inject(TYPES.PostReportRepository)
    private readonly _postReportRepository: IPostReportRepository,

    @inject(TYPES.PostRepository)
    private readonly _postRepository: IPostRepository,
  ) {}

  // Validate report ID.
  private validateReportId(reportId: string): void {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid report ID");
    }
  }

  // Create a report for a post.
  async createReport(
    postId: string,
    reporterId: string,
    payload: CreatePostReportDto,
  ): Promise<IPostReport> {
    // Validate post ID.
    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid post ID");
    }

    // Validate reporter ID.
    if (!Types.ObjectId.isValid(reporterId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid user ID");
    }

    // Check whether the post exists and is published.
    const post = await this._postRepository.findByIdWithUser(postId);

    if (!post || post.status !== "PUBLISHED") {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Published post not found");
    }

    // Prevent users from reporting their own posts.
    if (post.userId._id.toString() === reporterId) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "You cannot report your own post");
    }

    // Check whether the user has already reported this post.
    const existingReport = await this._postReportRepository.findUserReport(postId, reporterId);

    if (existingReport) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "You have already reported this post");
    }

    // Step 8: Save the report.
    try {
      const description = payload.description?.trim();

      const report = await this._postReportRepository.create({
        postId: new Types.ObjectId(postId),
        reporterId: new Types.ObjectId(reporterId),
        reason: payload.reason,
        ...(description && { description }),
      });

      return report;
    } catch (error) {
      // Handle duplicate submissions occurring simultaneously.
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        throw new AppError(STATUS_CODES.BAD_REQUEST, "You have already reported this post");
      }

      throw error;
    }
  }

  // Get all reports submitted by the logged-in user.
  async getMyReports(reporterId: string, filters: MyReportsFilter): Promise<MyReportsResponseDto> {
    // Validate user ID.
    if (!Types.ObjectId.isValid(reporterId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid user ID");
    }

    // Validate pagination.
    const { page, limit } = filters;

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Invalid page number");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Limit must be between 1 and 100");
    }

    // Fetch reports and total count.
    const [reports, totalReports] = await Promise.all([
      this._postReportRepository.findMyReports(reporterId, filters),

      this._postReportRepository.countMyReports(reporterId, filters),
    ]);

    // Calculate pagination.
    const totalPages = Math.ceil(totalReports / limit);

    return {
      reports,

      pagination: {
        currentPage: page,
        totalPages,
        totalReports,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // Get a single report belonging to the logged-in user.
  async getReportById(reportId: string, reporterId: string): Promise<IPostReport> {
    // Validate report ID.
    this.validateReportId(reportId);

    // Find the report belonging to this user.
    const report = await this._postReportRepository.findMyReportById(reportId, reporterId);

    if (!report) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Report not found");
    }

    return report;
  }

  // Cancel a pending report.
  async cancelReport(reportId: string, reporterId: string): Promise<void> {
    // Validate report ID.
    this.validateReportId(reportId);

    // Find the report belonging to this user.
    const existingReport = await this._postReportRepository.findMyReportById(reportId, reporterId);

    if (!existingReport) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Report not found");
    }

    // Only pending reports can be cancelled.
    if (existingReport.status !== "PENDING") {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Only pending reports can be cancelled");
    }

    // Delete the pending report.
    const cancelledReport = await this._postReportRepository.cancelMyReport(reportId, reporterId);

    if (!cancelledReport) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "Unable to cancel report. Please try again");
    }
  }
}
