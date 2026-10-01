import type { IPopulatedTripMember } from "@/interfaces/IRepository/user(traveler)/trip-planning/member.repo.interface";
import type { TripMemberResponse } from "@/interfaces/IServices/user(traveler)/trip-planning/member.service.interface";

export class TripMemberMapper {
  static toResponse(member: IPopulatedTripMember): TripMemberResponse {
    return {
      _id: member._id.toString(),

      tripId: member.tripId.toString(),

      user: {
        _id: member.userId._id.toString(),

        name: member.userId.fullName,

        profilePic: member.userId.profileImageUrl || "",
      },

      role: member.role,

      joinedAt: member.joinedAt.toISOString(),

      createdAt: member.createdAt.toISOString(),

      updatedAt: member.updatedAt.toISOString(),
    };
  }
}
