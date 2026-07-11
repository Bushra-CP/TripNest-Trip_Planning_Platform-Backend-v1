import type { Document, Types } from "mongoose";
import type { AuthProvider } from "../../../../enums/auth-provider.enum.js";
import type { UserRole } from "../../../../enums/user-role.enum.js";

export interface IUser extends Document {
  email: string;
  password: string;
  provider: AuthProvider;
  providerId: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
