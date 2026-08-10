import { Document } from "mongoose";
import { AuthProvider } from "../../enums/auth-provider.enum";
import { UserRole } from "../../enums/user-role.enum";

export interface IUser extends Document {
  email: string;
  password?: string;
  provider: AuthProvider;
  providerId: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
