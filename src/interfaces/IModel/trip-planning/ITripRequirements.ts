import { Document, Types } from "mongoose";

import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";

export interface ITripRequirements extends Document {
  tripId: Types.ObjectId;

  source: TripRequirements["source"];

  destinations: TripRequirements["destinations"];

  startDate: TripRequirements["startDate"];

  totalDays: TripRequirements["totalDays"];

  numberOfTravelers: TripRequirements["numberOfTravelers"];

  budget: TripRequirements["budget"];

  travelMode: TripRequirements["travelMode"];

  tripType: TripRequirements["tripType"];

  preferences: TripRequirements["preferences"];

  additionalDetails: TripRequirements["additionalDetails"];

  createdAt: Date;

  updatedAt: Date;
}
