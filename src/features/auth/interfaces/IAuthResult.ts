import type { UserRole } from "../../../enums/user-role.enum.js";

export interface IAuthResult {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };

  accessToken: string;

  refreshToken: string;

  message: string;
}
