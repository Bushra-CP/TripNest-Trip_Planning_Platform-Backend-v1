import type { PostStatus } from "@/interfaces/IModel/trip-tales/posts.model.interface";

export interface AdminTripTalesQueryDto {
  page?: number;
  limit?: number;
  search?: string | undefined;
  status?: PostStatus | undefined;
  sort?: "newest" | "oldest" | undefined;
}

export interface AdminTripTalesPostDto {
  id: string;

  user: {
    id: string;
    fullName: string;
    profileImageUrl: string;
  };

  title: string;
  destination: string;
  content: string;
  tags: string[];

  media: {
    key: string;
    url: string;
    type: "image" | "video";
  }[];

  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminTripTalesStatsDto {
  totalPosts: number;
  publishedPosts: number;
  blockedPosts: number;
}

export interface PaginatedAdminTripTalesResponseDto {
  posts: AdminTripTalesPostDto[];

  pagination: {
    currentPage: number;
    limit: number;
    totalPosts: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
