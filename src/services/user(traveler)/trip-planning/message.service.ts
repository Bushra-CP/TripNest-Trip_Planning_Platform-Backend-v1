import { TYPES } from "@/di/types";
import {
  SendMessageRequestDto,
  SendMessageResponseDto,
} from "@/dtos/user(traveler)/travel-planning/chat.req.res.dto";
import { ErrorMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ITravelerProfileRepository } from "@/interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { IMessageRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/message.repository.interface";
import { IRoomRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/room.repository.interface";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { MessageMapper } from "@/mapper/message.mapper";
import { AppError } from "@/shared/errors/app.error";
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
   * getMessagesByRoom
   *
   * @param {string} roomId
   * @return {*}  {Promise<SendMessageResponseDto[]>}
   * @memberof MessageService
   */
  async getMessagesByRoom(roomId: string): Promise<SendMessageResponseDto[]> {
    const normalizedRoomId = roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(normalizedRoomId);

    if (!room) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.ROOM_NOT_FOUND);
    }

    const messages = await this._messageRepository.findByRoomId(normalizedRoomId);

    // console.log(messages);

    return messages.map((message) => MessageMapper.toSavedMessage(message));
  }

  /**
   * saveMessage
   *
   * @param {SendMessageRequestDto} data
   * @return {*}  {Promise<SendMessageResponseDto>}
   * @memberof MessageService
   */
  async saveMessage(data: SendMessageRequestDto): Promise<SendMessageResponseDto> {
    const roomId = data.roomId.trim().toUpperCase();

    const room = await this._roomRepository.findByRoomId(roomId);

    if (!room) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.ROOM_NOT_FOUND);
    }

    const user = await this._travelerProfileRepository.findByUserId(data.senderId);

    if (!user) {
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.USER_NOT_FOUND);
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
      throw new AppError(STATUS_CODES.NOT_FOUND, ErrorMessages.FAILED_TO_RETRIEVE_MESSAGE);
    }

    return MessageMapper.toSavedMessage(messageWithSender);
  }
}
