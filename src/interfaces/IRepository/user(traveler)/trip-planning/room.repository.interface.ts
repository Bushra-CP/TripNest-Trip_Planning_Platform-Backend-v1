import { IRoom } from "@/interfaces/IModel/trip-planning/IRoom";
import { IBaseRepository } from "../../IBaseRepository";

export interface IRoomRepository extends IBaseRepository<IRoom> {
  findByRoomId(roomId: string): Promise<IRoom | null>;

  findByTripId(tripId: string): Promise<IRoom | null>;
}
