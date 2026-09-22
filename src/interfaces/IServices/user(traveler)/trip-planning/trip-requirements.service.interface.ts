import { ITripRequirements } from "@/interfaces/IModel/trip-planning/ITripRequirements";
import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";

export interface TripRequirementsPayload {
  tripId: string;
  requirements: TripRequirements;
}

export interface ITripRequirementsService {
  saveRequirements(payload: TripRequirementsPayload): Promise<ITripRequirements>;
}
