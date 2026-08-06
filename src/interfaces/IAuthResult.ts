import { UserRole } from "../enums/user-role.enum.js";

export interface IAuthResult {
  user: {
    fullName: string;
    email: string;
    role: UserRole;
    profileImage?: string;
  };

  accessToken: string;

  refreshToken: string;

  message: string;
}
