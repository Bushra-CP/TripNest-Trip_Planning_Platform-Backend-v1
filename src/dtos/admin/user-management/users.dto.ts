import { UserRole } from "@/enums/user-role.enum";
import { PaginatedResponseDto } from "../pagination.dto";

export const USER_STATUS = ["Active", "Blocked"] as const;

export type UserStatus = (typeof USER_STATUS)[number];

export interface UserDto {
  id: string;

  fullName: string;

  email: string;

  phoneNumber: string | null;

  profileImage: string | null;

  role: UserRole;

  status: UserStatus;

  createdAt: string | Date;
}

export interface GetUsersRequestDto {
  page: number;

  limit: number;

  search?: string | undefined;

  status?: UserStatus | undefined;
}

export type GetUsersResponseDto = PaginatedResponseDto<UserDto>;

//FOR REPOSITORY

export interface UserWithProfile {
  id: string;

  fullName: string;

  email: string;

  phone?: string;

  profileImageUrl?: string;

  role: UserRole;

  isActive: boolean;

  createdAt: Date;
}

export interface UserProfile {
  fullName: string;

  phone?: string;

  country: string;

  state: string;

  city: string;

  bio?: string;

  profileImageUrl?: string;

  socialPresence: {
    url: string;
  }[];

  referenceId?: string;

  rewardPoints: number;

  createdAt: Date;

  updatedAt: Date;
}

export interface PaginatedUsers {
  users: UserWithProfile[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface UpdateUserStatusDto {
  userId: string;

  isActive: boolean;
}
