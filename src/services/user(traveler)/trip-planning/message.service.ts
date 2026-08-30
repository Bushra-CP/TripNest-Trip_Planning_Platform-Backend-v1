import { TYPES } from "@/di/types";
import {
  SendMessageRequestDto,
  SendMessageResponseDto,
} from "@/dtos/user(traveler)/travel-planning/chat.req.res.dto";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IMessageRepository";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/IRoomRepository";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { MessageMapper } from "@/mapper/message.mapper";
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
  async getMessagesByRoom(roomId: string): Promise<SendMessageResponseDto[]> {
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(normalizedRoomId);

    if (!room) {
      throw new Error("Room not found");
    }

    const messages = await this._messageRepository.findByRoomId(normalizedRoomId);

    // console.log(messages);

    return messages.map((message) => MessageMapper.toSavedMessage(message));
  }

  /**
   * Save a new message
   */
  async saveMessage(data: SendMessageRequestDto): Promise<SendMessageResponseDto> {
    const roomId = data.roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(roomId);

    if (!room) {
      throw new Error("Room does not exist");
    }

    const user = await this._travelerProfileRepository.findByUserId(data.senderId);

    if (!user) {
      throw new Error("User does not exist");
    }

    const messageRes = await this._messageRepository.create({
      roomId,
      senderId: new mongoose.Types.ObjectId(data.senderId),
      message: data.message,
    });

    const messageWithSender = await this._messageRepository.findByIdWithSender(
      messageRes._id.toString(),
    );

    if (!messageWithSender) {
      throw new Error("Failed to retrieve saved message");
    }

    return MessageMapper.toSavedMessage(messageWithSender);
  }
}
