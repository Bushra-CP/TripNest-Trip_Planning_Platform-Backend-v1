import {
  AdminPostReportDto,
  AdminPostReportsQueryDto,
  AdminPostReportsStatsDto,
  PaginatedAdminPostReportsResponseDto,
} from "@/dtos/admin/trip-tales/admin-post-reports.dto";

import { PostReportStatus } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

export interface IAdminPostReportsService {
  // Get all reports with filters and pagination.
  getReports(query: AdminPostReportsQueryDto): Promise<PaginatedAdminPostReportsResponseDto>;

  // Get a single report with complete details.
  getReportById(reportId: string): Promise<AdminPostReportDto>;

  // Get report statistics.
  getStats(): Promise<AdminPostReportsStatsDto>;

  // Update report status.
  updateReportStatus(reportId: string, status: PostReportStatus): Promise<AdminPostReportDto>;
}
