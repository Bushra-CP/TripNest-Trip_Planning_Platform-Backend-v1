import { IPostReport } from "@/interfaces/IModel/trip-tales/post-report.model.interface";

export interface CreatePostReportDto {
  reason: IPostReport["reason"];
  description?: string;
}

export interface MyReportsResponseDto {
  reports: IPostReport[];

  pagination: {
    currentPage: number;
    totalPages: number;
    totalReports: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
