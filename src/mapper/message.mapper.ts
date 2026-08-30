import { SendMessageResponseDto } from "@/dtos/user(traveler)/travel-planning/chat.req.res.dto";
import { IChatMessageWithSender } from "@/interfaces/IModel/IMessage";

export class MessageMapper {
  static toSavedMessage(messageRes: IChatMessageWithSender): SendMessageResponseDto {
    return {
      _id: messageRes._id.toString(),
      roomId: messageRes.roomId,
      senderId: messageRes.senderId.toString(),
      senderName: messageRes.sender.fullName,
      senderPic: messageRes.sender.profileImageUrl,
      message: messageRes.message,
      createdAt: messageRes.createdAt,
    };
  }
}
