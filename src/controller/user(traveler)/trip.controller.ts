import { inject, injectable } from "inversify";
import { Request, Response } from "express";

import { TYPES } from "@/di/types";
import { TripService } from "@/services/user(traveler)/trip-planning/trip.service";

@injectable()
export class TripController {
  constructor(
    @inject(TYPES.TripService)
    private readonly _tripService: TripService,
  ) {}

  getMyTrips = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });

        return;
      }

      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const tripMode =
        req.query.tripMode === "solo" || req.query.tripMode === "group"
          ? req.query.tripMode
          : undefined;

      const trips = await this._tripService.getTripsByOwnerId(userId, search, tripMode);

      res.status(200).json({
        success: true,
        message: "Trips fetched successfully",
        data: trips,
      });
    } catch (error) {
      console.error("Failed to fetch trips:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch trips",
      });
    }
  };
}
