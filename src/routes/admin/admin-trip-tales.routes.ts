import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "@/di/types";
import { UserRole } from "@/enums/user-role.enum";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { AdminTripTalesController } from "@/controller/admin/admin-trip-tales.controller";

@injectable()
export class AdminTripTalesRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.AdminTripTalesController)
    private readonly _adminTripTalesController: AdminTripTalesController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(
      "/trip-tales/stats",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._adminTripTalesController.getStats.bind(this._adminTripTalesController),
    );

    this.router.get(
      "/trip-tales",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._adminTripTalesController.getPosts.bind(this._adminTripTalesController),
    );

    this.router.get(
      "/trip-tales/:postId",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._adminTripTalesController.getPostById.bind(this._adminTripTalesController),
    );

    this.router.patch(
      "/trip-tales/:postId/block",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._adminTripTalesController.blockPost.bind(this._adminTripTalesController),
    );

    this.router.patch(
      "/trip-tales/:postId/unblock",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._adminTripTalesController.unblockPost.bind(this._adminTripTalesController),
    );
  }
}
