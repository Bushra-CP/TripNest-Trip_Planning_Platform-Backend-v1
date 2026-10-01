import { TYPES } from "@/di/types";
import { ErrorMessages, SuccessMessages } from "@/enums/messages.enum";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import { ResponseHandler } from "@/shared/http/responseHandler";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class RoomController {
  constructor(
    @inject(TYPES.RoomService)
    private readonly _roomService: IRoomService,
  ) {}

  /**
   * Get room by room ID
   *
   * @param {Request} req
   * @param {Response} res
   * @return {*}  {Promise<void>}
   * @memberof RoomController
   */
  async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;

      if (!roomId || Array.isArray(roomId)) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, ErrorMessages.INVALID_ROOM_ID);

        return;
      }

      const data = await this._roomService.getRoom(roomId);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.ROOM_FETCHED, data);
    } catch (error) {
      next(error);
    }
  }
}
