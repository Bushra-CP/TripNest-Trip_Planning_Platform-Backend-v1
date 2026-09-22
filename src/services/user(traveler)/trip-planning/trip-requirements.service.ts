import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";

import { ITripRequirements } from "@/interfaces/IModel/trip-planning/ITripRequirements";
import { ITripRequirementsRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-requirements.repository.interface";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";

import {
  ITripRequirementsService,
  TripRequirementsPayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/trip-requirements.service.interface";

import { AppError } from "@/shared/errors/app.error";
import { inject, injectable } from "inversify";

@injectable()
export class TripRequirementsService implements ITripRequirementsService {
  constructor(
    @inject(TYPES.TripRequirementsRepository)
    private readonly _tripRequirementsRepository: ITripRequirementsRepository,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,
  ) {}

  /**
   * saveRequirements
   *
   * @param {TripRequirementsPayload} payload
   * @return {*}  {Promise<ITripRequirements>}
   * @memberof TripRequirementsService
   */
  async saveRequirements(payload: TripRequirementsPayload): Promise<ITripRequirements> {
    const { tripId, requirements } = payload;

    // Check if Trip exists.
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    // Check if requirements already exist for this Trip.
    const existingRequirements = await this._tripRequirementsRepository.findByTripId(tripId);

    //Requirements already exist - Update them with the latest AI state.
    if (existingRequirements) {
      const updatedRequirements = await this._tripRequirementsRepository.updateByTripId(tripId, {
        source: requirements.source,

        destinations: requirements.destinations,

        startDate: requirements.startDate,

        totalDays: requirements.totalDays,

        numberOfTravelers: requirements.numberOfTravelers,

        budget: requirements.budget,

        travelMode: requirements.travelMode,

        tripType: requirements.tripType,

        preferences: requirements.preferences,

        additionalDetails: requirements.additionalDetails,
      });

      if (!updatedRequirements) {
        throw new AppError(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          ErrorMessages.FAILED_TO_UPDATE_TRIP_REQUIREMENTS,
        );
      }

      return updatedRequirements;
    }

    //Requirements don't exist yet - Create them for this Trip.
    return this._tripRequirementsRepository.create({
      tripId: trip._id,

      source: requirements.source,

      destinations: requirements.destinations,

      startDate: requirements.startDate,

      totalDays: requirements.totalDays,

      numberOfTravelers: requirements.numberOfTravelers,

      budget: requirements.budget,

      travelMode: requirements.travelMode,

      tripType: requirements.tripType,

      preferences: requirements.preferences,

      additionalDetails: requirements.additionalDetails,
    });
  }
}
