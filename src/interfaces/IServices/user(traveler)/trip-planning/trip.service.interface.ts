import { ITrip } from "@/interfaces/IModel/trip-planning/ITrip";

export interface CreateTripPayload {
  ownerId: string;
  threadId: string;
  title: string;
}

export interface UpdateTripPayload {
  title?: string;
  tripMode?: "solo" | "group";
  status?: "planning" | "ready" | "completed" | "cancelled";
  roomId?: string | null;
}

export interface ITripService {
  createTrip(payload: CreateTripPayload): Promise<ITrip>;

  getTripsByOwnerId(
    ownerId: string,
    search?: string,
    tripMode?: "solo" | "group",
  ): Promise<ITrip[]>;

  updateTrip(tripId: string, data: UpdateTripPayload): Promise<ITrip>;

  updateTripMode(tripId: string, tripMode: "solo" | "group"): Promise<ITrip>;
}
