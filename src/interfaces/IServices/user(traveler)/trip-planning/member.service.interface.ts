export interface CreateMemberPayload {
  roomId: string;
}

export interface UpdateMemberPayload {
  threadId: string;
  role: "MEMBER" | "GUEST";
}

//User information returned along with trip member.
export interface TripMemberUserResponse {
  _id: string;
  name: string;
  profilePic?: string;
}
export interface TripMemberResponse {
  _id: string;
  tripId: string;
  user: TripMemberUserResponse;
  role: "OWNER" | "MEMBER" | "GUEST";
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JoinGroupResponse {
  member: TripMemberResponse;
  tripId: string;
  roomId: string;
  threadId: string;
  tripMode: "group";
}

export interface IMemberService {
  createTripMember(data: CreateMemberPayload, userId: string): Promise<JoinGroupResponse>;

  updateTripMember(data: UpdateMemberPayload, userId: string): Promise<TripMemberResponse>;

  deleteTripMember(threadId: string, userId: string): Promise<void>;

  getTripMembers(threadId: string): Promise<TripMemberResponse[]>;
}
