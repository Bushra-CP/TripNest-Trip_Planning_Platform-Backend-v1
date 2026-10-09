import { ITripCostResponse } from "@/dtos/user(traveler)/travel-planning/fuel-cost/trip-cost.dto";

export interface ITripCostService {
  getTripVehicleCosts(tripId: string): Promise<ITripCostResponse>;
}
