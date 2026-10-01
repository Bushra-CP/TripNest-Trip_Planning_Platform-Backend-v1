import type { ITripMember, TripMemberRole } from "@/interfaces/IModel/trip-planning/ITripMember";
import type { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";
import { Types } from "mongoose";

export interface IPopulatedTripMember {
  _id: Types.ObjectId;
  tripId: Types.ObjectId;

  userId: {
    _id: Types.ObjectId;
    fullName: string;
    profileImageUrl?: string;
  };

  role: TripMemberRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMemberRepository extends IBaseRepository<ITripMember> {
  findByTripAndUser(tripId: string, userId: string): Promise<ITripMember | null>;

  findByTripId(tripId: string): Promise<IPopulatedTripMember[]>;

  findByIdWithUser(memberId: string): Promise<IPopulatedTripMember | null>;
}
