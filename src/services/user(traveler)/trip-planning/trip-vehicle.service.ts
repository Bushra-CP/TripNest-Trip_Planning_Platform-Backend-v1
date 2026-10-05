import { TYPES } from "@/di/types";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ITripVehicle } from "@/interfaces/IModel/trip-planning/ITripVehicle";
import { IMemberRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/member.repo.interface";
import { ITripVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip-vehicle-repo.interface";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { IVehicleRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/vehicle.repo.interface";
import { ITripVehicleService } from "@/interfaces/IServices/user(traveler)/trip-planning/trip-vehicle.service.interface";
import { TripVehicleMapper, TripVehicleResponse } from "@/mapper/trip-vehicle.mapper";
import { AppError } from "@/shared/errors/app.error";
import { inject, injectable } from "inversify";
import { Types } from "mongoose";

@injectable()
export class TripVehicleService implements ITripVehicleService {
  constructor(
    @inject(TYPES.TripVehicleRepository)
    private readonly _tripVehicleRepository: ITripVehicleRepository,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,

    @inject(TYPES.VehicleRepository)
    private readonly _vehicleRepository: IVehicleRepository,

    @inject(TYPES.MemberRepository)
    private readonly _memberRepository: IMemberRepository,
  ) {}

  /**
   * ADD VEHICLE TO TRIP
   *
   * @param {string} tripId
   * @param {string} vehicleId
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  async addVehicleToTrip(
    tripId: string,
    vehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    const finalVehicle = await this._tripVehicleRepository.findRawFinalSelectedByTripId(tripId);

    if (finalVehicle) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.VEHICLE_ALREADY_FINALIZED);
    }

    // Permission check
    if (trip.tripMode === "solo") {
      // For solo trips, only the trip owner can add a vehicle.
      if (trip.ownerId?.toString() !== userId) {
        throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.ONLY_TRIP_OWNER_CAN_ADD_VEHICLE);
      }
    } else {
      // For group trips, only OWNER and MEMBER can add vehicles.
      await this.checkMemberPermission(tripId, userId);
    }

    // Make sure the vehicle belongs to the user.
    const vehicle = await this._vehicleRepository.findByIdAndOwnerId(vehicleId, userId);

    if (!vehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.VEHICLE_NOT_FOUND);
    }

    // Check if this exact vehicle is already added to the trip.
    const existingTripVehicle = await this._tripVehicleRepository.findByTripAndVehicle(
      tripId,
      vehicleId,
    );

    if (existingTripVehicle) {
      throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.VEHICLE_ALREADY_ADDED_TO_TRIP);
    }

    // Find the vehicle previously selected by this user.
    const existingUserVehicle = await this._tripVehicleRepository.findByTripAndUser(tripId, userId);

    // If the user already has a vehicle in this trip,
    // remove it before adding the new vehicle.
    if (existingUserVehicle) {
      await this._tripVehicleRepository.deleteById(existingUserVehicle._id.toString());
    }

    let tripVehicle: ITripVehicle;

    // SOLO TRIP
    if (trip.tripMode === "solo") {
      tripVehicle = await this._tripVehicleRepository.create({
        tripId: new Types.ObjectId(tripId),
        vehicleId: new Types.ObjectId(vehicleId),
        addedBy: new Types.ObjectId(userId),
        voters: [],
        finalSelected: true,
      });
    } else {
      // GROUP TRIP
      tripVehicle = await this._tripVehicleRepository.create({
        tripId: new Types.ObjectId(tripId),
        vehicleId: new Types.ObjectId(vehicleId),
        addedBy: new Types.ObjectId(userId),
        voters: [],
        finalSelected: false,
      });
    }

    // Fetch the newly created TripVehicle with vehicle details.
    const populatedTripVehicle = await this._tripVehicleRepository.findByIdWithVehicle(
      tripVehicle._id.toString(),
    );

    if (!populatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return TripVehicleMapper.toResponse(populatedTripVehicle);
  }

  /**
   * GET ALL VEHICLES PROPOSED FOR A TRIP
   *
   * @param {string} tripId
   * @return {*}  {Promise<ITripVehicle[]>}
   * @memberof TripVehicleService
   */
  async getTripVehicles(tripId: string): Promise<TripVehicleResponse[]> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    const tripVehicles = await this._tripVehicleRepository.findByTripId(tripId);

    return tripVehicles.map(TripVehicleMapper.toResponse);
  }

  /**
   * GET THE FINAL SELECTED VEHICLE
   *
   * @param {string} tripId
   * @return {*}  {(Promise<ITripVehicle | null>)}
   * @memberof TripVehicleService
   */
  async getFinalSelectedVehicle(tripId: string): Promise<TripVehicleResponse | null> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    const tripVehicle = await this._tripVehicleRepository.findFinalSelectedByTripId(tripId);

    if (!tripVehicle) {
      return null;
    }

    return TripVehicleMapper.toResponse(tripVehicle);
  }

  /**
   * REMOVE VEHICLE FROM TRIP
   *
   * @param {string} tripId
   * @param {string} vehicleId
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  async removeVehicleFromTrip(
    tripId: string,
    vehicleId: string,
    userId: string,
  ): Promise<ITripVehicle> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    if (trip.tripMode === "solo") {
      if (trip.ownerId?.toString() !== userId) {
        throw new AppError(
          STATUS_CODES.FORBIDDEN,
          ErrorMessages.ONLY_TRIP_OWNER_CAN_REMOVE_VEHICLE,
        );
      }
    } else {
      await this.checkMemberPermission(tripId, userId);
    }

    const tripVehicle = await this._tripVehicleRepository.findByTripAndVehicle(tripId, vehicleId);

    if (!tripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.VEHICLE_IS_NOT_ADDED_TO_TRIP);
    }

    const deletedVehicle = await this._tripVehicleRepository.deleteById(tripVehicle._id.toString());

    if (!deletedVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return deletedVehicle;
  }

  /**
   * VOTE FOR A VEHICLE
   *
   * A user can have only one vote for a trip.
   * If the user already voted for another vehicle, their vote will be moved to this vehicle.
   *
   * @param {string} tripId
   * @param {string} tripVehicleId
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  async voteForVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    // Only OWNER and MEMBER can vote.
    await this.checkMemberPermission(tripId, userId);

    // Get raw TripVehicles because we only need voter information here.
    const tripVehicles = await this._tripVehicleRepository.findRawByTripId(tripId);

    const selectedTripVehicle = tripVehicles.find((item) => item._id.toString() === tripVehicleId);

    if (!selectedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    // Remove user's vote from other vehicles.
    for (const tripVehicle of tripVehicles) {
      const hasVoted = tripVehicle.voters.some((voterId) => voterId.toString() === userId);

      if (hasVoted && tripVehicle._id.toString() !== tripVehicleId) {
        await this.removeUserVote(tripVehicle, userId);
      }
    }

    // Add vote to selected vehicle.
    const alreadyVoted = selectedTripVehicle.voters.some(
      (voterId) => voterId.toString() === userId,
    );

    if (!alreadyVoted) {
      selectedTripVehicle.voters.push(new Types.ObjectId(userId));
    }

    const updatedVehicle = await this._tripVehicleRepository.updateById(tripVehicleId, {
      voters: selectedTripVehicle.voters,
    });

    if (!updatedVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    // Fetch again with vehicle details populated.
    const populatedTripVehicle =
      await this._tripVehicleRepository.findByIdWithVehicle(tripVehicleId);

    if (!populatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return TripVehicleMapper.toResponse(populatedTripVehicle);
  }

  /**
   * REMOVE USER'S VOTE
   *
   * @param {string} tripId
   * @param {string} tripVehicleId
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  async removeVote(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    await this.checkMemberPermission(tripId, userId);

    if (trip.tripMode !== "group") {
      throw new AppError(
        STATUS_CODES.BAD_REQUEST,
        ErrorMessages.VOTING_AVAILABLE_ONLY_FOR_GROUP_TRIPS,
      );
    }

    const tripVehicle = await this._tripVehicleRepository.findById(tripVehicleId);

    if (!tripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    if (tripVehicle.tripId.toString() !== tripId) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.VEHICLE_DOES_NOT_BELONG_TO_TRIP);
    }

    await this.removeUserVote(tripVehicle, userId);

    const populatedTripVehicle =
      await this._tripVehicleRepository.findByIdWithVehicle(tripVehicleId);

    if (!populatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return TripVehicleMapper.toResponse(populatedTripVehicle);
  }

  /**
   * FINALIZE VEHICLE - Only the trip OWNER can finalize a vehicle
   *
   * @param {string} tripId
   * @param {string} tripVehicleId
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  async finalizeVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    if (trip.tripMode !== "group") {
      throw new AppError(
        STATUS_CODES.BAD_REQUEST,
        ErrorMessages.VEHICLE_FINALIZATION_ONLY_FOR_GROUP_TRIPS,
      );
    }

    const member = await this._memberRepository.findByTripAndUser(tripId, userId);

    if (!member || member.role !== "OWNER") {
      throw new AppError(
        STATUS_CODES.FORBIDDEN,
        ErrorMessages.ONLY_TRIP_OWNER_CAN_FINALIZE_VEHICLE,
      );
    }

    const selectedTripVehicle = await this._tripVehicleRepository.findById(tripVehicleId);

    if (!selectedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    if (selectedTripVehicle.tripId.toString() !== tripId) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.VEHICLE_DOES_NOT_BELONG_TO_TRIP);
    }

    // Remove final selection from the previous vehicle
    const currentFinalVehicle =
      await this._tripVehicleRepository.findRawFinalSelectedByTripId(tripId);

    if (currentFinalVehicle && currentFinalVehicle._id.toString() !== tripVehicleId) {
      await this._tripVehicleRepository.updateById(currentFinalVehicle._id.toString(), {
        finalSelected: false,
      });
    }

    // Make the selected vehicle final
    const updatedTripVehicle = await this._tripVehicleRepository.updateById(tripVehicleId, {
      finalSelected: true,
    });

    if (!updatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    // Return populated response
    const populatedTripVehicle =
      await this._tripVehicleRepository.findByIdWithVehicle(tripVehicleId);

    if (!populatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return TripVehicleMapper.toResponse(populatedTripVehicle);
  }

  /**
   * UNFINALIZE VEHICLE
   *
   * @param {string} tripId
   * @param {string} tripVehicleId
   * @param {string} userId
   * @return {*}  {Promise<TripVehicleResponse>}
   * @memberof TripVehicleService
   */
  async unfinalizeVehicle(
    tripId: string,
    tripVehicleId: string,
    userId: string,
  ): Promise<TripVehicleResponse> {
    const trip = await this._tripRepository.findById(tripId);

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_NOT_FOUND);
    }

    // Only OWNER can unfinalize
    const member = await this._memberRepository.findByTripAndUser(tripId, userId);

    if (!member || member.role !== "OWNER") {
      throw new AppError(
        STATUS_CODES.FORBIDDEN,
        ErrorMessages.ONLY_TRIP_OWNER_CAN_UNFINALIZE_VEHICLE,
      );
    }

    const tripVehicle = await this._tripVehicleRepository.findById(tripVehicleId);

    if (!tripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    if (tripVehicle.tripId.toString() !== tripId) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.VEHICLE_DOES_NOT_BELONG_TO_TRIP);
    }

    if (!tripVehicle.finalSelected) {
      throw new AppError(STATUS_CODES.BAD_REQUEST, ErrorMessages.VEHICLE_IS_NOT_FINALIZED);
    }

    // Remove final selection
    const updatedTripVehicle = await this._tripVehicleRepository.updateById(tripVehicleId, {
      finalSelected: false,
    });

    if (!updatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    // Return populated response
    const populatedTripVehicle =
      await this._tripVehicleRepository.findByIdWithVehicle(tripVehicleId);

    if (!populatedTripVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return TripVehicleMapper.toResponse(populatedTripVehicle);
  }

  /**
   * Check whether a user is OWNER or MEMBER of the trip
   *
   * @private
   * @param {string} tripId
   * @param {string} userId
   * @return {*}  {(Promise<"OWNER" | "MEMBER">)}
   * @memberof TripVehicleService
   */
  private async checkMemberPermission(tripId: string, userId: string): Promise<"OWNER" | "MEMBER"> {
    const member = await this._memberRepository.findByTripAndUser(tripId, userId);

    if (!member) {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.NOT_A_MEMBER_OF_THIS_TRIP);
    }

    if (member.role === "GUEST") {
      throw new AppError(STATUS_CODES.FORBIDDEN, ErrorMessages.GUESTS_CANNOT_PERFROM_THIS_ACTION);
    }

    return member.role;
  }

  /**
   * To remove a user's vote
   *
   * @private
   * @param {ITripVehicle} tripVehicle
   * @param {string} userId
   * @return {*}  {Promise<ITripVehicle>}
   * @memberof TripVehicleService
   */
  private async removeUserVote(tripVehicle: ITripVehicle, userId: string): Promise<ITripVehicle> {
    const updatedVoters = tripVehicle.voters.filter((voterId) => voterId.toString() !== userId);

    const updatedVehicle = await this._tripVehicleRepository.updateById(
      tripVehicle._id.toString(),
      {
        voters: updatedVoters,
      },
    );

    if (!updatedVehicle) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.TRIP_VEHICLE_NOT_FOUND);
    }

    return updatedVehicle;
  }
}
