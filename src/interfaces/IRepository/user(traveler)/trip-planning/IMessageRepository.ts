import { IChatMessage } from "@/interfaces/IModel/IMessage";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface IMessageRepository extends IBaseRepository<IChatMessage> {
  findByRoomId(roomId: string): Promise<IChatMessage[]>;
}
