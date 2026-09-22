import { injectable } from "inversify";
import { BaseRepository } from "@/repositories/base.repository";
import { IChatMessage, IChatMessageWithSender } from "@/interfaces/IModel/trip-planning/IMessage";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/message.repository.interface";
import { ChatMessageModel } from "@/models/user(traveler)/trip-planning/chat-message.model";
import mongoose from "mongoose";

@injectable()
export class MessageRepository extends BaseRepository<IChatMessage> implements IMessageRepository {
  constructor() {
    super(ChatMessageModel);
  }

  async findByRoomId(roomId: string): Promise<IChatMessageWithSender[]> {
    const messages = await ChatMessageModel.aggregate<IChatMessageWithSender>([
      {
        $match: {
          roomId,
        },
      },

      {
        $lookup: {
          from: "travelerprofiles",
          localField: "senderId",
          foreignField: "userId",
          as: "sender",
        },
      },

      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: false,
        },
      },

      {
        $sort: {
          createdAt: 1,
        },
      },
    ]).exec();

    return messages;
  }

  async findByIdWithSender(messageId: string): Promise<IChatMessageWithSender | null> {
    const messages = await ChatMessageModel.aggregate<IChatMessageWithSender>([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(messageId),
        },
      },

      {
        $lookup: {
          from: "travelerprofiles",
          localField: "senderId",
          foreignField: "userId",
          as: "sender",
        },
      },

      {
        $unwind: "$sender",
      },
    ]).exec();

    return messages[0] ?? null;
  }
}
