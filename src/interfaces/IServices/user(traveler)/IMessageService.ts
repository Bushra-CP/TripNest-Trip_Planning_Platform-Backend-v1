import {
  SendMessageRequestDto,
  SendMessageResponseDto,
} from "@/dtos/user(traveler)/travel-planning/chat.req.res.dto";

export interface IMessageService {
  getMessagesByRoom(roomId: string): Promise<SendMessageResponseDto[]>;

  saveMessage(data: SendMessageRequestDto): Promise<SendMessageResponseDto>;
}
