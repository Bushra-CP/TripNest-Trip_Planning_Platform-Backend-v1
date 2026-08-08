export interface PaginationDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}
