import type { UpdateQuery } from "mongoose";
import { IBaseRepository } from "../../IBaseRepository";
import { ITripRoute } from "@/interfaces/IModel/trip-planning/ITripRoute";

export interface ITripRouteRepository extends IBaseRepository<ITripRoute> {
  findByTripId(tripId: string): Promise<ITripRoute | null>;

  updateByTripId(tripId: string, data: UpdateQuery<ITripRoute>): Promise<ITripRoute | null>;
}
