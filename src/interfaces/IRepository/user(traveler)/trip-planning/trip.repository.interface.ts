import type { ITrip } from "../../../IModel/trip-planning/ITrip";
import { IBaseRepository } from "../../IBaseRepository";

export interface ITripRepository extends IBaseRepository<ITrip> {
  findByOwnerId(ownerId: string): Promise<ITrip[]>;

  findByThreadId(threadId: string): Promise<ITrip | null>;

  findByRoomId(roomId: string): Promise<ITrip | null>;
}
