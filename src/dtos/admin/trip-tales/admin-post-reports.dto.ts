import {
  PostReportReason,
  PostReportStatus,
} from "@/interfaces/IModel/trip-tales/post-report.model.interface";

import { IPostMedia } from "@/interfaces/IModel/trip-tales/posts.model.interface";

// Reporter information
export interface AdminReportReporterDto {
  _id: string;
  fullName?: string;
  profileImageUrl?: string;
}

// Post author information
export interface AdminReportPostAuthorDto {
  _id: string;
  fullName?: string;
  profileImageUrl?: string;
}

// Reported post information
export interface AdminReportedPostDto {
  _id: string;
  title: string;
  destination?: string;
  content: string;
  media: IPostMedia[];
  status: "PUBLISHED" | "BLOCKED";
  author: AdminReportPostAuthorDto | null;
}

// Complete report information
export interface AdminPostReportDto {
  _id: string;

  reason: PostReportReason;

  description?: string;

  status: PostReportStatus;

  reviewedAt?: Date;

  createdAt: Date;

  updatedAt: Date;

  reporter: AdminReportReporterDto | null;

  post: AdminReportedPostDto | null;
}

// Query parameters
export interface AdminPostReportsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: PostReportStatus;
  reason?: PostReportReason;
  sort?: "newest" | "oldest";
}

// Pagination information
export interface AdminPostReportsPaginationDto {
  currentPage: number;
  limit: number;
  totalReports: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Paginated reports response
export interface PaginatedAdminPostReportsResponseDto {
  reports: AdminPostReportDto[];
  pagination: AdminPostReportsPaginationDto;
}

// Report statistics
export interface AdminPostReportsStatsDto {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  rejected: number;
}
