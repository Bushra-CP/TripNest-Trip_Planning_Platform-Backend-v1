import {
  CreatePostReportDto,
  MyReportsResponseDto,
} from "@/dtos/user(traveler)/trip-tales/post-report.dto";
import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

import { MyReportsFilter } from "@/interfaces/IRepository/user(traveler)/trip-tales/post-report.repository.interface";

export interface IPostReportService {
  // Create a report.
  createReport(
    postId: string,
    reporterId: string,
    payload: CreatePostReportDto,
  ): Promise<IPostReport>;

  // Get reports submitted by the logged-in user.
  getMyReports(reporterId: string, filters: MyReportsFilter): Promise<MyReportsResponseDto>;

  // Get a single report submitted by the logged-in user.
  getReportById(reportId: string, reporterId: string): Promise<IPostReport>;

  // Cancel a pending report.
  cancelReport(reportId: string, reporterId: string): Promise<void>;
}
