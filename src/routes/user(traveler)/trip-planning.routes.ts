import { MessageController } from "@/controller/user(traveler)/message.controller";
import { RoomController } from "@/controller/user(traveler)/room.controller";
import { TYPES } from "@/di/types";
import { UserRole } from "@/enums/user-role.enum";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { Router } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class TripPlanningRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.RoomController)
    private readonly _roomController: RoomController,

    @inject(TYPES.MessageController)
    private readonly _messageController: MessageController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * Create a new room
     */
    this.router.post(
      "/room",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._roomController.createRoom.bind(this._roomController),
    );

    /**
     * Get room by room ID
     */
    this.router.get(
      "/:roomId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._roomController.getRoom.bind(this._roomController),
    );

    //Get messages
    this.router.get(
      "/messages/:roomId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._messageController.getMessagesByRoom,
    );
  }
}
