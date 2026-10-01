import { IRoom } from "@/interfaces/IModel/trip-planning/IRoom";

export interface IRoomService {
  createRoom(userId: string, tripId: string): Promise<IRoom>;

  getRoom(roomId: string): Promise<IRoom>;
}
