import { AIPlanningController } from "@/controller/user(traveler)/ai-planning.controller";
import { MemberController } from "@/controller/user(traveler)/member.controller";
import { MessageController } from "@/controller/user(traveler)/message.controller";
import { RoomController } from "@/controller/user(traveler)/room.controller";
import { TripController } from "@/controller/user(traveler)/trip.controller";
import { VehicleController } from "@/controller/user(traveler)/vehicle.controller";
import { TYPES } from "@/di/types";
import { UserRole } from "@/enums/user-role.enum";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  createVehicleSchema,
  updateVehicleSchema,
} from "@/validation/user(traveler)/trip-planning/vehicle.schema";
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

    @inject(TYPES.AIPlanningController)
    private readonly _aiPlanningController: AIPlanningController,

    @inject(TYPES.TripController)
    private readonly _tripController: TripController,

    @inject(TYPES.VehicleController)
    private readonly _vehicleController: VehicleController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,

    @inject(TYPES.MemberController)
    private readonly _memberController: MemberController,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /**
     * Get room by room ID - join room
     */
    this.router.get(
      "/room/:roomId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._roomController.getRoom.bind(this._roomController),
    );

    //Get messages
    this.router.get(
      "/room/:roomId/messages",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._messageController.getMessagesByRoom.bind(this._messageController),
    );

    this.router.post(
      "/message",
      this._authenticateMiddleware.optionalAuthenticate,
      this._aiPlanningController.sendMessage.bind(this._aiPlanningController),
    );

    this.router.get(
      "/trip/:threadId",
      this._aiPlanningController.getPlanningState.bind(this._aiPlanningController),
    );

    this.router.get(
      "/trips",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._tripController.getMyTrips.bind(this._tripController),
    );

    this.router.post(
      "/trips/convert-to-group",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._tripController.convertToGroupTrip.bind(this._tripController),
    );

    this.router.get(
      "/trips/:threadId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._tripController.getTripByThreadId.bind(this._tripController),
    );

    //MEMBER ROUTES
    this.router.post(
      "/members",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._memberController.createTripMember,
    );

    this.router.patch(
      "/members",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._memberController.updateTripMember,
    );

    this.router.delete(
      "/members",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._memberController.deleteTripMember,
    );

    this.router.get(
      "/members/:threadId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._memberController.getTripMembers,
    );

    //Vehicle routes
    this.router.post(
      "/vehicles",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(createVehicleSchema),
      this._vehicleController.createVehicle.bind(this._vehicleController),
    );

    this.router.get(
      "/vehicles",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._vehicleController.getVehicles.bind(this._vehicleController),
    );

    this.router.get(
      "/vehicles/:vehicleId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._vehicleController.getVehicleById.bind(this._vehicleController),
    );

    this.router.patch(
      "/vehicles/:vehicleId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(updateVehicleSchema),
      this._vehicleController.updateVehicle.bind(this._vehicleController),
    );

    this.router.delete(
      "/vehicles/:vehicleId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._vehicleController.deleteVehicle.bind(this._vehicleController),
    );
  }
}
