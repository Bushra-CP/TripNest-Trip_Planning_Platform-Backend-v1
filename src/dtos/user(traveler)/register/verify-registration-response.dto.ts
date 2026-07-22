import type { UserRole } from "../../../enums/user-role.enum";

export interface AuthResponseDto {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };

  accessToken: string;

  message: string;
}
