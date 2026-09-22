import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";

import { ITripRoute } from "@/interfaces/IModel/trip-planning/ITripRoute";
import { ITripRouteRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-route.repository.interface";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";

import {
  ITripRouteService,
  TripRoutePayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/trip-route.service.interface";

import { AppError } from "@/shared/errors/app.error";
import { inject, injectable } from "inversify";

@injectable()
export class TripRouteService implements ITripRouteService {
  constructor(
    @inject(TYPES.TripRouteRepository)
    private readonly _tripRouteRepository: ITripRouteRepository,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,
  ) {}

  /**
   * saveRoute
   *
   * @param {TripRoutePayload} payload
   * @return {*}  {Promise<ITripRoute>}
   * @memberof TripRouteService
   */
  async saveRoute(payload: TripRoutePayload): Promise<ITripRoute> {
    const { tripId, route } = payload;

    // Check if Trip exists.
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    // Check if a route already exists for this Trip.
    const existingRoute = await this._tripRouteRepository.findByTripId(tripId);

    //Route already exists - Update it with the latest calculated route.
    if (existingRoute) {
      const updatedRoute = await this._tripRouteRepository.updateByTripId(tripId, {
        distanceMeters: route.distanceMeters,

        durationSeconds: route.durationSeconds,

        encodedPolyline: route.encodedPolyline,

        locations: route.locations,

        legs: route.legs,
      });

      if (!updatedRoute) {
        throw new AppError(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          ErrorMessages.FAILED_TO_UPDATE_TRIP_ROUTE,
        );
      }

      return updatedRoute;
    }

    //Route doesn't exist yet - Create it for this Trip.
    return this._tripRouteRepository.create({
      tripId: trip._id,

      distanceMeters: route.distanceMeters,

      durationSeconds: route.durationSeconds,

      encodedPolyline: route.encodedPolyline,

      locations: route.locations,

      legs: route.legs,
    });
  }
}
