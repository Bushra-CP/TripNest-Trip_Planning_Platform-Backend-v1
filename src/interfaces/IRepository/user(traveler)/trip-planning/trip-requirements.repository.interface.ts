import { ITripRequirements } from "@/interfaces/IModel/trip-planning/ITripRequirements";
import type { UpdateQuery } from "mongoose";
import { IBaseRepository } from "../../IBaseRepository";

export interface ITripRequirementsRepository extends IBaseRepository<ITripRequirements> {
  findByTripId(tripId: string): Promise<ITripRequirements | null>;

  updateByTripId(
    tripId: string,
    data: UpdateQuery<ITripRequirements>,
  ): Promise<ITripRequirements | null>;
}
