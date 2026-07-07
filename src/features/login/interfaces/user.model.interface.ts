import type { Document, Types } from "mongoose";

export type UserRole = "traveler" | "admin";

export interface IUserModel extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
