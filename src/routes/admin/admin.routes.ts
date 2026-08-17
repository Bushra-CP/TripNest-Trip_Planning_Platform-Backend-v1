import { UserManagementController } from "@/controller/admin/user.controller";
import { TYPES } from "@/di/types";
import { UserRole } from "@/enums/user-role.enum";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { validate } from "@/middleware/validate.middleware";
import { getUsersSchema } from "@/validation/admin/user-management/users.validation";
import { Router } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class UserManagementRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.UserManagementController)
    private readonly _userManagementController: UserManagementController,

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
      "/users",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      validate(getUsersSchema),
      this._userManagementController.getUsers.bind(this._userManagementController),
    );

    this.router.patch(
      "/user/:id",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._userManagementController.updateUserStatus.bind(this._userManagementController),
    );

    this.router.get(
      "/user/:id",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.ADMIN),
      this._userManagementController.getUserDetails.bind(this._userManagementController),
    );
  }
}
