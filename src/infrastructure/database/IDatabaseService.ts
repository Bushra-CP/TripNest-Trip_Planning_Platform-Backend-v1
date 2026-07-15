import type { ClientSession } from "mongoose";

export interface IDatabaseService {
  executeTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
  ): Promise<T>;
}
