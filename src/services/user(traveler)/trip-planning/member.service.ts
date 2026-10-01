import { TYPES } from "@/di/types";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/room.repository.interface";
import { IMemberRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/member.repo.interface";
import {
  CreateMemberPayload,
  IMemberService,
  JoinGroupResponse,
  TripMemberResponse,
  UpdateMemberPayload,
} from "@/interfaces/IServices/user(traveler)/trip-planning/member.service.interface";
import { AppError } from "@/shared/errors/app.error";
import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { ITripRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/trip.repository.interface";
import { TripMemberMapper } from "@/mapper/trip-member.mapper";

@injectable()
export class MemberService implements IMemberService {
  constructor(
    @inject(TYPES.MemberRepository)
    private readonly _memberRepository: IMemberRepository,

    @inject(TYPES.RoomRepository)
    private readonly _roomRepository: IRoomRepository,

    @inject(TYPES.TripRepository)
    private readonly _tripRepository: ITripRepository,
  ) {}

  /**
   * CREATE TRIP MEMBER
   *
   * @param {CreateMemberPayload} data
   * @param {string} userId
   * @return {*}  {Promise<ITripMember>}
   * @memberof MemberService
   */
  async createTripMember(data: CreateMemberPayload, userId: string): Promise<JoinGroupResponse> {
    const { roomId } = data;

    const room = await this._roomRepository.findOne({
      roomId: roomId.trim().toUpperCase(),
    });

    if (!room) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Room not found");
    }

    const trip = await this._tripRepository.findById(room.tripId.toString());

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip not found");
    }

    if (trip.tripMode !== "group") {
      throw new AppError(STATUS_CODES.BAD_REQUEST, "This trip is not a group trip");
    }

    const existingMember = await this._memberRepository.findOne({
      tripId: room.tripId,
      userId: new Types.ObjectId(userId),
    });

    if (existingMember) {
      throw new AppError(STATUS_CODES.CONFLICT, "User is already a member of this trip");
    }

    const member = await this._memberRepository.create({
      tripId: trip._id,
      userId: new Types.ObjectId(userId),
      role: "GUEST",
    });

    const populatedMember = await this._memberRepository.findByIdWithUser(member._id.toString());

    if (!populatedMember) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }

    return {
      member: TripMemberMapper.toResponse(populatedMember),

      tripId: trip._id.toString(),

      roomId: room.roomId,

      threadId: trip.threadId,

      tripMode: trip.tripMode,
    };
  }

  /**
   * UPDATE TRIP MEMBER
   *
   * @param {UpdateMemberPayload} data
   * @param {string} userId
   * @return {*}  {Promise<ITripMember>}
   * @memberof MemberService
   */
  async updateTripMember(data: UpdateMemberPayload, userId: string): Promise<TripMemberResponse> {
    const { threadId, role } = data;

    const trip = await this._tripRepository.findByThreadId(threadId.trim());

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip not found");
    }

    const member = await this._memberRepository.findByTripAndUser(trip._id.toString(), userId);

    if (!member) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }

    const updatedMember = await this._memberRepository.updateById(member._id.toString(), { role });

    if (!updatedMember) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }

    const populatedMember = await this._memberRepository.findByIdWithUser(
      updatedMember._id.toString(),
    );

    if (!populatedMember) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }

    return TripMemberMapper.toResponse(populatedMember);
  }

  /**
   * DELETE TRIP MEMBER
   *
   * @param {string} threadId
   * @param {string} userId
   * @return {*}  {Promise<void>}
   * @memberof MemberService
   */
  async deleteTripMember(threadId: string, userId: string): Promise<void> {
    const trip = await this._tripRepository.findByThreadId(threadId.trim());

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip not found");
    }

    const member = await this._memberRepository.findByTripAndUser(trip._id.toString(), userId);

    if (!member) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }

    const deletedMember = await this._memberRepository.deleteById(member._id.toString());

    if (!deletedMember) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip member not found");
    }
  }

  async getTripMembers(threadId: string): Promise<TripMemberResponse[]> {
    const trip = await this._tripRepository.findByThreadId(threadId.trim());

    if (!trip) {
      throw new AppError(STATUS_CODES.NOT_FOUND, "Trip not found");
    }

    const members = await this._memberRepository.findByTripId(trip._id.toString());

    return members.map((member) => TripMemberMapper.toResponse(member));
  }
}
