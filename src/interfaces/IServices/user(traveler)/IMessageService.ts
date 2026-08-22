import { IChatMessage } from "@/interfaces/IModel/IMessage";

export interface SendMessageData {
  roomId: string;
  senderId: string;
  message: string;
  createdAt: Date;
}

export interface IMessageService {
  getMessagesByRoom(roomId: string): Promise<IChatMessage[]>;

  saveMessage(data: SendMessageData): Promise<IChatMessage>;
}
