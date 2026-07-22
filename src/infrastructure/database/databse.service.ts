import { injectable } from "inversify";
import { IDatabaseService } from "./IDatabaseService.js";
import { ClientSession } from "mongoose";
import mongoose from "mongoose";

@injectable()
export class DatabaseService implements IDatabaseService {
  async executeTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const result = await operation(session);

      await session.commitTransaction();

      return result;
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  }
}
