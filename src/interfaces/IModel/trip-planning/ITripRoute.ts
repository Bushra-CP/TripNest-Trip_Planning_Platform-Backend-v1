import { Document, Types } from "mongoose";

import type { RoutePlanningResult } from "@/interfaces/trip-planning/route.interfaces";

export interface ITripRoute extends Document {
  tripId: Types.ObjectId;

  distanceMeters: RoutePlanningResult["distanceMeters"];

  durationSeconds: RoutePlanningResult["durationSeconds"];

  encodedPolyline: RoutePlanningResult["encodedPolyline"];

  locations: RoutePlanningResult["locations"];

  legs: RoutePlanningResult["legs"];

  createdAt: Date;

  updatedAt: Date;
}
