import { TYPES } from "@/di/types";
import { IChatMessage } from "@/interfaces/IModel/IMessage";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IMessageRepository";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IRoomRepository";
import {
  IMessageService,
  SendMessageData,
} from "@/interfaces/IServices/user(traveler)/IMessageService";
import { injectable, inject } from "inversify";
import mongoose from "mongoose";

@injectable()
export class MessageService implements IMessageService {
  constructor(
    @inject(TYPES.MessageRepository)
    private readonly _messageRepository: IMessageRepository,

    @inject(TYPES.RoomRepository)
    private readonly _roomRepository: IRoomRepository,

    @inject(TYPES.TravelerProfileRepository)
    private readonly _travelerProfileRepository: ITravelerProfileRepository,
  ) {}

  /**
   * Get messages for a room
   */
  async getMessagesByRoom(roomId: string): Promise<IChatMessage[]> {
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(normalizedRoomId);

    if (!room) {
      throw new Error("Room not found");
    }

    return this._messageRepository.findByRoomId(normalizedRoomId);
  }

  /**
   * Save a new message
   */
  async saveMessage(data: SendMessageData): Promise<IChatMessage> {
    const roomId = data.roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(roomId);

    if (!room) {
      throw new Error("Room does not exist");
    }

    const user = await this._travelerProfileRepository.findById(data.senderId);

    if (!user) {
      throw new Error("User does not exist");
    }

    return this._messageRepository.create({
      roomId,
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderName: user.fullName,
      message: data.message,
    });
  }
}
