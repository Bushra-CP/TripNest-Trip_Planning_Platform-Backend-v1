import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";
import { IBaseRepository } from "../../IBaseRepository";
import {
  PostReportStatus,
  PostReportReason,
} from "@/interfaces/IModel/trip-tales/post-report.model.interface";

export interface MyReportsFilter {
  page: number;
  limit: number;
  status?: PostReportStatus;
  reason?: PostReportReason;
  search?: string;
  sort?: "newest" | "oldest";
}

export interface IPostReportRepository extends IBaseRepository<IPostReport> {
  // Check whether a user has already reported a post.
  findUserReport(postId: string, reporterId: string): Promise<IPostReport | null>;

  // Get reports belonging to a particular user with filters and pagination.
  findMyReports(reporterId: string, filters: MyReportsFilter): Promise<IPostReport[]>;

  // Count reports belonging to a particular user.
  countMyReports(reporterId: string, filters: MyReportsFilter): Promise<number>;

  // Find a particular report belonging to a user.
  findMyReportById(reportId: string, reporterId: string): Promise<IPostReport | null>;

  // Cancel a pending report belonging to a user.
  cancelMyReport(reportId: string, reporterId: string): Promise<IPostReport | null>;
}
