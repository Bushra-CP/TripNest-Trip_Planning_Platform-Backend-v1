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
    private readonly userManagementController: UserManagementController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly authorizeMiddleware: AuthorizeMiddleware,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get(
      "/users",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.ADMIN),
      validate(getUsersSchema),
      this.userManagementController.getUsers.bind(this.userManagementController),
    );

    this.router.patch(
      "/user/:id",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.ADMIN),
      this.userManagementController.updateUserStatus.bind(this.userManagementController),
    );

    this.router.get(
      "/user/:id",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.ADMIN),
      this.userManagementController.getUserDetails.bind(this.userManagementController),
    );
  }
}
