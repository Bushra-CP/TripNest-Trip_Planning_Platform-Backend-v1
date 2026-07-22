import type { UserRole } from "../../enums/user-role.enum";

export interface LoginResponseDto {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };

  accessToken: string;

  message: string;
}
