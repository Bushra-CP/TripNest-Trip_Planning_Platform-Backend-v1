import type { ClientSession } from "mongoose";
import type { IUser } from "./IUser.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;

  findById(id: string): Promise<IUser | null>;

  create(user: Partial<IUser>, session?: ClientSession): Promise<IUser>;

  update(id: string, user: Partial<IUser>): Promise<IUser | null>;
}

// ClientSession is primarily for transaction-related operations.
// For example:
// create(user: CreateUserDto, session?: ClientSession): Promise<IUser>;
// If session is not provided, it performs a normal database operation.
// If session is provided, the operation becomes part of a MongoDB transaction.
