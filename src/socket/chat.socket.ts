import { Server } from "socket.io";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { SendMessageRequestDto } from "@/dtos/user(traveler)/travel-planning/chat.req.res.dto";

@injectable()
export class ChatSocket {
  constructor(
    @inject(TYPES.RoomService)
    private readonly _roomService: IRoomService,

    @inject(TYPES.MessageService)
    private readonly _messageService: IMessageService,
  ) {}

  initialize(io: Server): void {
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      /**
       * Join a room
       */
      socket.on("joinRoom", async (roomId: string) => {
        try {
          const normalizedRoomId = roomId.trim().toUpperCase();

          const room = await this._roomService.getRoom(normalizedRoomId);

          if (!room) {
            socket.emit("roomError", "Room not found");
            return;
          }

          socket.join(normalizedRoomId);

          console.log(`${socket.id} joined room ${normalizedRoomId}`);

          socket.emit("roomJoined", normalizedRoomId);
        } catch (error) {
          console.error("Join room error:", error);

          socket.emit("roomError", "Failed to join room");
        }
      });

      /**
       * Send message
       */
      socket.on("sendMessage", async (data: SendMessageRequestDto) => {
        try {
          const savedMessage = await this._messageService.saveMessage(data);

          const roomId = data.roomId.trim().toUpperCase();

          io.to(roomId).emit("receiveMessage", savedMessage);
        } catch (error) {
          console.error("Send message error:", error);

          socket.emit("roomError", "Failed to send message");
        }
      });

      /**
       * Disconnect
       */
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }
}
