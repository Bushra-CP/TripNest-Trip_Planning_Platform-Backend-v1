import { IRoom } from "@/interfaces/IModel/IRoom";
import { IBaseRepository } from "../../IBaseRepository";

export interface IRoomRepository extends IBaseRepository<IRoom> {
  findByRoomId(roomId: string): Promise<IRoom | null>;
}
