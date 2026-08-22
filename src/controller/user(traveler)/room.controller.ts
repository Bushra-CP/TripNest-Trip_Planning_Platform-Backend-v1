import { TYPES } from "@/di/types";
import { IRoomService } from "@/interfaces/IServices/user(traveler)/IRoomService";
import type { Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class RoomController {
  constructor(
    @inject(TYPES.RoomService)
    private readonly _roomService: IRoomService,
  ) {}

  /**
   * Create a new room
   */
  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.userId;

      const room = await this._roomService.createRoom(userId);

      res.status(201).json(room);
    } catch (error) {
      console.error("Create room error:", error);

      res.status(500).json({
        message: "Failed to create room",
      });
    }
  }

  /**
   * Get room by room ID
   */
  async getRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      const room = await this._roomService.getRoom(roomId as string);

      res.status(200).json(room);
    } catch (error) {
      console.error("Get room error:", error);

      if (error instanceof Error && error.message === "Room not found") {
        res.status(404).json({
          message: "Room not found",
        });

        return;
      }

      res.status(500).json({
        message: "Failed to find room",
      });
    }
  }
}
