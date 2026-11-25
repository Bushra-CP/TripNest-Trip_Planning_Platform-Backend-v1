import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { RoutePlanningService } from "../ai-planning/route-planning.service";

export interface TravelTimeResult {
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
}

@injectable()
export class ItineraryTravelTimeService {
  constructor(
    @inject(TYPES.RoutePlanningService)
    private readonly _routePlanningService: RoutePlanningService,
  ) {}

  public async getTravelTime(
    origin: string,
    destination: string,
    travelMode: string,
  ): Promise<TravelTimeResult> {
    if (!origin.trim() || !destination.trim()) {
      throw new Error("Origin and destination are required");
    }

    const route = await this._routePlanningService.calculateRoute({
      source: origin,
      destinations: [destination],
      travelMode,
    });

    return {
      origin,
      destination,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      durationMinutes: Math.ceil(route.durationSeconds / 60),
    };
  }
}
