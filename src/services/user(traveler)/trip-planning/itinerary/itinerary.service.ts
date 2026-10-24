import { inject, injectable } from "inversify";
import { Types } from "mongoose";

import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";

import type { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import type { IItineraryRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary.repository.interface";
import type { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";

import { AppError } from "@/shared/errors/app.error";
import {
  IItineraryService,
  SaveItineraryPayload,
  UpdateItineraryPayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

@injectable()
export class ItineraryService implements IItineraryService {
  constructor(
    @inject(TYPES.ItineraryRepository)
    private readonly _itineraryRepository: IItineraryRepository,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,
  ) {}

  /**
   * Save a newly generated itinerary.
   *
   * @param {SaveItineraryPayload} payload
   * @return {*}  {Promise<IItinerary>}
   * @memberof ItineraryService
   */
  public async saveItinerary(payload: SaveItineraryPayload): Promise<IItinerary> {
    const { tripId, threadId, userId, requirements, title, days } = payload;

    const trip = await this.validateTrip(tripId, threadId);

    // Prevent accidental duplicate itineraries for the same trip.
    const existingItinerary = await this._itineraryRepository.findByTripId(tripId);

    if (existingItinerary) {
      return existingItinerary;
    }

    return this._itineraryRepository.create({
      tripId: trip._id,
      threadId,
      userId: userId ? new Types.ObjectId(userId) : null,

      title,
      source: requirements.source ?? "",
      destinations: requirements.destinations.map((destination) => destination.name),

      totalDays: requirements.totalDays ?? days.length,
      numberOfTravelers: requirements.numberOfTravelers ?? 1,
      travelMode: requirements.travelMode ?? "unspecified",
      tripType: requirements.tripType ?? "unspecified",
      preferences: requirements.preferences,
      mustVisitPlaces: requirements.mustVisitPlaces,
      preferredActivities: requirements.preferredActivities,
      excludedPlaces: requirements.excludedPlaces,
      excludedActivityTypes: requirements.excludedActivityTypes,

      budget: requirements.budget,
      startDate: requirements.startDate,

      days,
      version: 1,
    });
  }

  /**
   * Retrieve the itinerary associated with a trip.
   *
   * @param {string} tripId
   * @param {string} threadId
   * @return {*}  {(Promise<IItinerary | null>)}
   * @memberof ItineraryService
   */
  public async getItineraryByTripId(tripId: string, threadId: string): Promise<IItinerary | null> {
    await this.validateTrip(tripId, threadId);

    return this._itineraryRepository.findByTripId(tripId);
  }

  /**
   * Update an existing itinerary after validating its associated trip.
   *
   * @param {UpdateItineraryPayload} payload
   * @return {*}  {Promise<IItinerary>}
   * @memberof ItineraryService
   */
  public async updateItinerary(payload: UpdateItineraryPayload): Promise<IItinerary> {
    const { tripId, threadId, title, days } = payload;

    await this.validateTrip(tripId, threadId);

    const existingItinerary = await this._itineraryRepository.findByTripId(tripId);

    if (!existingItinerary) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.ITINERARY_NOT_FOUND);
    }

    const updateData: Partial<IItinerary> = {
      version: existingItinerary.version + 1,
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (days !== undefined) {
      updateData.days = days;
    }

    const updatedItinerary = await this._itineraryRepository.updateByTripId(tripId, updateData);

    if (!updatedItinerary) {
      throw new AppError(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        ErrorMessages.FAILED_TO_UPDATE_ITINERARY,
      );
    }

    return updatedItinerary;
  }

  /**
   * Delete the itinerary associated with a trip.
   *
   * @param {string} tripId
   * @param {string} threadId
   * @return {*}  {Promise<boolean>}
   * @memberof ItineraryService
   */
  public async deleteItineraryByTripId(tripId: string, threadId: string): Promise<boolean> {
    await this.validateTrip(tripId, threadId);

    const deletedItinerary = await this._itineraryRepository.deleteByTripId(tripId);

    return deletedItinerary !== null;
  }

  /**
   * Validate the trip
   *
   * @private
   * @param {string} tripId
   * @param {string} threadId
   * @return {*}
   * @memberof ItineraryService
   */
  private async validateTrip(tripId: string, threadId: string) {
    if (!Types.ObjectId.isValid(tripId)) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.TRIP_NOT_FOUND);
    }

    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    if (trip.threadId !== threadId) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    return trip;
  }
}
