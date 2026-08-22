import { TYPES } from "@/di/types";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import type { Request, Response } from "express";
import { inject } from "inversify";

export class MessageController {
  constructor(
    @inject(TYPES.MessageService)
    private readonly _messageService: IMessageService,
  ) {}

  //Get messages for a room
  getMessagesByRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomId } = req.params;

      const messages = await this._messageService.getMessagesByRoom(roomId as string);

      res.status(200).json(messages);
    } catch (error) {
      console.error("Get messages error:", error);

      res.status(500).json({
        message: "Failed to fetch messages",
      });
    }
  };
}
