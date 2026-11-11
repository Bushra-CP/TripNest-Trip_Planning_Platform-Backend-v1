import { injectable } from "inversify";
import { Types } from "mongoose";

import { BaseRepository } from "@/repositories/base.repository";

import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

import {
  IPostReportRepository,
  MyReportsFilter,
} from "@/interfaces/IRepository/user(traveler)/trip-tales/post-report.repository.interface";

import { PostReportModel } from "@/models/user(traveler)/trip-tales/post-report.model";

@injectable()
export class PostReportRepository
  extends BaseRepository<IPostReport>
  implements IPostReportRepository
{
  constructor() {
    super(PostReportModel);
  }

  // Check whether the user has already reported this post.
  async findUserReport(postId: string, reporterId: string): Promise<IPostReport | null> {
    return this.model
      .findOne({
        postId: new Types.ObjectId(postId),
        reporterId: new Types.ObjectId(reporterId),
      })
      .exec();
  }

  // Get reports belonging to a user with filters and pagination.
  async findMyReports(reporterId: string, filters: MyReportsFilter): Promise<IPostReport[]> {
    const { page, limit, status, reason, search, sort } = filters;

    const filter: Record<string, unknown> = {
      reporterId: new Types.ObjectId(reporterId),
    };

    if (status) {
      filter.status = status;
    }

    if (reason) {
      filter.reason = reason;
    }

    // Search by post title or destination.
    if (search?.trim()) {
      const matchingPosts = await this.model.db
        .model("TripTalesPosts")
        .find({
          $or: [
            { title: { $regex: search.trim(), $options: "i" } },
            { destination: { $regex: search.trim(), $options: "i" } },
          ],
        })
        .select("_id")
        .lean();

      filter.postId = {
        $in: matchingPosts.map((post) => post._id),
      };
    }

    const skip = (page - 1) * limit;

    return this.model
      .find(filter)
      .populate({
        path: "postId",
        select: "title destination media status",
      })
      .sort({ createdAt: sort === "oldest" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  // Count reports belonging to a user with filters.
  async countMyReports(reporterId: string, filters: MyReportsFilter): Promise<number> {
    const { status, reason, search } = filters;

    const filter: Record<string, unknown> = {
      reporterId: new Types.ObjectId(reporterId),
    };

    if (status) {
      filter.status = status;
    }

    if (reason) {
      filter.reason = reason;
    }

    if (search?.trim()) {
      const matchingPosts = await this.model.db
        .model("TripTalesPosts")
        .find({
          $or: [
            { title: { $regex: search.trim(), $options: "i" } },
            { destination: { $regex: search.trim(), $options: "i" } },
          ],
        })
        .select("_id")
        .lean();

      filter.postId = {
        $in: matchingPosts.map((post) => post._id),
      };
    }

    return this.model.countDocuments(filter).exec();
  }

  // Find a particular report belonging to the user.
  async findMyReportById(reportId: string, reporterId: string): Promise<IPostReport | null> {
    return this.model
      .findOne({
        _id: new Types.ObjectId(reportId),
        reporterId: new Types.ObjectId(reporterId),
      })
      .populate({
        path: "postId",
        select: "title destination media status",
      })
      .exec();
  }

  // Cancel only a pending report belonging to the user.
  async cancelMyReport(reportId: string, reporterId: string): Promise<IPostReport | null> {
    return this.model
      .findOneAndDelete({
        _id: new Types.ObjectId(reportId),
        reporterId: new Types.ObjectId(reporterId),
        status: "PENDING",
      })
      .exec();
  }
}
