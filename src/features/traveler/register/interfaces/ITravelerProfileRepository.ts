import type { ClientSession } from "mongoose";
import type { ITravelerProfile } from "./ITravelerPofile.js";

export interface ITravelerProfileRepository {
  create(
    profile: Partial<ITravelerProfile>,
    session?: ClientSession,
  ): Promise<ITravelerProfile>;

  findByUserId(userId: string): Promise<ITravelerProfile | null>;

  update(
    userId: string,
    data: Partial<ITravelerProfile>,
  ): Promise<ITravelerProfile | null>;
}
