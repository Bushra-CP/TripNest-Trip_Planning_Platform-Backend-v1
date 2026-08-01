import { UserRole } from "../enums/user-role.enum.js";

export interface IAuthResult {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    profileImage?: string;
  };

  accessToken: string;

  refreshToken: string;

  message: string;
}
