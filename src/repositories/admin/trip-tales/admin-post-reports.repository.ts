import { injectable } from "inversify";
import { Types, type PipelineStage } from "mongoose";

import { BaseRepository } from "@/repositories/base.repository";

import { PostReportModel } from "@/models/user(traveler)/trip-tales/post-report.model";
import { PostModel } from "@/models/user(traveler)/trip-tales/post.model";

import {
  IPostReport,
  PostReportStatus,
} from "@/interfaces/IModel/trip-tales/post-report.model.interface";

import { IAdminPostReportsRepository } from "@/interfaces/IRepository/admin/trip-tales/admin-post-reports.repository.interface";

import {
  AdminPostReportDto,
  AdminPostReportsQueryDto,
  AdminPostReportsStatsDto,
} from "@/dtos/admin/trip-tales/admin-post-reports.dto";

@injectable()
export class AdminPostReportsRepository
  extends BaseRepository<IPostReport>
  implements IAdminPostReportsRepository
{
  constructor() {
    super(PostReportModel);
  }

  // Build the common aggregation pipeline.
  private buildReportsPipeline(filters: AdminPostReportsQueryDto): PipelineStage[] {
    const { search, status, reason } = filters;

    const pipeline: PipelineStage[] = [
      // Step 1: Populate the reported post.
      {
        $lookup: {
          from: PostModel.collection.name,
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },

      {
        $unwind: {
          path: "$post",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 2: Populate the reporter's user document.
      {
        $lookup: {
          from: "users",
          localField: "reporterId",
          foreignField: "_id",
          as: "reporter",
        },
      },

      {
        $unwind: {
          path: "$reporter",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 3: Populate the reporter's traveler profile.
      // TravelerProfile references User through userId.
      {
        $lookup: {
          from: "travelerprofiles",
          localField: "reporter._id",
          foreignField: "userId",
          as: "reporterProfile",
        },
      },

      {
        $unwind: {
          path: "$reporterProfile",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 4: Populate the original post author's user document.
      {
        $lookup: {
          from: "users",
          localField: "post.userId",
          foreignField: "_id",
          as: "postAuthor",
        },
      },

      {
        $unwind: {
          path: "$postAuthor",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 5: Populate the original post author's traveler profile.
      {
        $lookup: {
          from: "travelerprofiles",
          localField: "postAuthor._id",
          foreignField: "userId",
          as: "postAuthorProfile",
        },
      },

      {
        $unwind: {
          path: "$postAuthorProfile",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const match: Record<string, unknown> = {};

    // Step 6: Filter by report status.
    if (status) {
      match.status = status;
    }

    // Step 7: Filter by report reason.
    if (reason) {
      match.reason = reason;
    }

    // Step 8: Search by report ID, post title,
    // destination or reporter name.
    if (search?.trim()) {
      const searchValue = search.trim();

      // Escape special regex characters.
      const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      const searchConditions: Record<string, unknown>[] = [
        { "post.title": searchRegex },
        { "post.destination": searchRegex },
        { "reporterProfile.fullName": searchRegex },
      ];

      // Search by report ID when the search value is a valid ObjectId.
      if (Types.ObjectId.isValid(searchValue)) {
        searchConditions.push({
          _id: new Types.ObjectId(searchValue),
        });
      }

      match.$or = searchConditions;
    }

    // Apply filters only when conditions exist.
    if (Object.keys(match).length > 0) {
      pipeline.push({
        $match: match,
      });
    }

    return pipeline;
  }

  // Get all reports with filters, sorting and pagination.
  async findReports(filters: AdminPostReportsQueryDto): Promise<AdminPostReportDto[]> {
    const { page = 1, limit = 10, sort = "newest" } = filters;

    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      ...this.buildReportsPipeline(filters),

      // Sort reports by submission date.
      {
        $sort: {
          createdAt: sort === "oldest" ? 1 : -1,
          _id: sort === "oldest" ? 1 : -1,
        },
      },

      // Skip records from previous pages.
      {
        $skip: skip,
      },

      // Limit the number of reports returned.
      {
        $limit: limit,
      },

      // Return only the required fields.
      {
        $project: {
          _id: { $toString: "$_id" },
          reason: 1,
          description: 1,
          status: 1,
          reviewedAt: 1,
          createdAt: 1,
          updatedAt: 1,

          // Reporter details.
          reporter: {
            _id: { $toString: "$reporter._id" },
            fullName: "$reporterProfile.fullName",
            profileImageUrl: "$reporterProfile.profileImageUrl",
          },

          // Reported post details.
          post: {
            _id: { $toString: "$post._id" },
            title: "$post.title",
            destination: "$post.destination",
            content: "$post.content",
            media: "$post.media",
            status: "$post.status",

            // Original post author details.
            author: {
              _id: { $toString: "$postAuthor._id" },
              fullName: "$postAuthorProfile.fullName",
              profileImageUrl: "$postAuthorProfile.profileImageUrl",
            },
          },
        },
      },
    ];

    return PostReportModel.aggregate<AdminPostReportDto>(pipeline).exec();
  }

  // Count reports matching the applied filters.
  async countReports(filters: AdminPostReportsQueryDto): Promise<number> {
    const pipeline: PipelineStage[] = [
      ...this.buildReportsPipeline(filters),

      {
        $count: "total",
      },
    ];

    const result = await PostReportModel.aggregate<{
      total: number;
    }>(pipeline).exec();

    return result[0]?.total ?? 0;
  }

  // Get one report with complete details.
  async findReportById(reportId: string): Promise<AdminPostReportDto | null> {
    if (!Types.ObjectId.isValid(reportId)) {
      return null;
    }

    const pipeline: PipelineStage[] = [
      ...this.buildReportsPipeline({}),

      {
        $match: {
          _id: new Types.ObjectId(reportId),
        },
      },

      {
        $project: {
          _id: { $toString: "$_id" },
          reason: 1,
          description: 1,
          status: 1,
          reviewedAt: 1,
          createdAt: 1,
          updatedAt: 1,

          // Reporter details.
          reporter: {
            _id: { $toString: "$reporter._id" },
            fullName: "$reporterProfile.fullName",
            profileImageUrl: "$reporterProfile.profileImageUrl",
          },

          // Reported post details.
          post: {
            _id: { $toString: "$post._id" },
            title: "$post.title",
            destination: "$post.destination",
            content: "$post.content",
            media: "$post.media",
            status: "$post.status",

            // Original post author details.
            author: {
              _id: { $toString: "$postAuthor._id" },
              fullName: "$postAuthorProfile.fullName",
              profileImageUrl: "$postAuthorProfile.profileImageUrl",
            },
          },
        },
      },
    ];

    const result = await PostReportModel.aggregate<AdminPostReportDto>(pipeline).exec();

    return result[0] ?? null;
  }

  // Get report statistics grouped by status.
  async countReportsByStatus(): Promise<AdminPostReportsStatsDto> {
    const result = await PostReportModel.aggregate<{
      _id: PostReportStatus;
      count: number;
    }>([
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]).exec();

    const pending = result.find((item) => item._id === "PENDING")?.count ?? 0;

    const reviewed = result.find((item) => item._id === "REVIEWED")?.count ?? 0;

    const resolved = result.find((item) => item._id === "RESOLVED")?.count ?? 0;

    const rejected = result.find((item) => item._id === "REJECTED")?.count ?? 0;

    return {
      total: pending + reviewed + resolved + rejected,
      pending,
      reviewed,
      resolved,
      rejected,
    };
  }
}
