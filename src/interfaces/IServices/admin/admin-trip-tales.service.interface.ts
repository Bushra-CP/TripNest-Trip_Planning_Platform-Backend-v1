import type {
  AdminTripTalesPostDto,
  AdminTripTalesQueryDto,
  AdminTripTalesStatsDto,
  PaginatedAdminTripTalesResponseDto,
} from "@/dtos/admin/trip-tales/admin-trip-tales.dto";

export interface IAdminTripTalesService {
  getPosts(query: AdminTripTalesQueryDto): Promise<PaginatedAdminTripTalesResponseDto>;

  getPostById(postId: string): Promise<AdminTripTalesPostDto | null>;

  getStats(): Promise<AdminTripTalesStatsDto>;

  blockPost(postId: string): Promise<void>;

  unblockPost(postId: string): Promise<void>;
}
