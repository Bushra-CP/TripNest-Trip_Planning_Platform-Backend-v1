import { Router } from "express";
import { inject, injectable } from "inversify";

import type { AuthController } from "../controller/auth.controller.js";

import { loginSchema } from "../validation/login.schema.js";
import { TYPES } from "../../../di/types.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";

@injectable()
export class AuthRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.AuthController)
    private readonly authController: AuthController,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/login",
      validate(loginSchema),
      this.authController.login.bind(this.authController),
    );

    this.router.post(
      "/refresh-token",
      this.authController.refreshToken.bind(this.authController),
    );

    this.router.post(
      "/logout",
      this.authController.logout.bind(this.authController),
    );
  }
}
