import { TYPES } from "@/di/types";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IMessageService } from "@/interfaces/IServices/user(traveler)/IMessageService";
import { ResponseHandler } from "@/shared/http/responseHandler";
import type { NextFunction, Request, Response } from "express";
import { inject } from "inversify";

export class MessageController {
  constructor(
    @inject(TYPES.MessageService)
    private readonly _messageService: IMessageService,
  ) {}

  /**
   * Get messages for a room
   *
   * @param {Request} req
   * @param {Response} res
   * @memberof MessageController
   */
  getMessagesByRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roomId } = req.params;

      if (!roomId || Array.isArray(roomId) || roomId.trim().length === 0) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_ROOM_ID);

        return;
      }

      const messages = await this._messageService.getMessagesByRoom(roomId as string);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.MESSAGES_FETCHED, messages);
    } catch (error) {
      next(error);
    }
  };
}
