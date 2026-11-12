import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

import {
  AdminPostReportDto,
  AdminPostReportsStatsDto,
  AdminPostReportsQueryDto,
} from "@/dtos/admin/trip-tales/admin-post-reports.dto";

export interface IAdminPostReportsRepository extends IBaseRepository<IPostReport> {
  // Fetch all reports with filters and pagination.
  findReports(filters: AdminPostReportsQueryDto): Promise<AdminPostReportDto[]>;

  // Count reports matching the filters.
  countReports(filters: AdminPostReportsQueryDto): Promise<number>;

  // Fetch a single report with complete details.
  findReportById(reportId: string): Promise<AdminPostReportDto | null>;

  // Count reports grouped by status.
  countReportsByStatus(): Promise<AdminPostReportsStatsDto>;
}
