import { injectable } from "inversify";
import { BaseRepository } from "@/repositories/base.repository";
import { IChatMessage } from "@/interfaces/IModel/IMessage";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IMessageRepository";
import { ChatMessageModel } from "@/models/user(traveler)/chat-message.model";

@injectable()
export class MessageRepository extends BaseRepository<IChatMessage> implements IMessageRepository {
  constructor() {
    super(ChatMessageModel);
  }

  //Find all messages belonging to a room
  async findByRoomId(roomId: string): Promise<IChatMessage[]> {
    return ChatMessageModel.find({
      roomId,
    }).sort({
      createdAt: 1,
    });
  }
}
