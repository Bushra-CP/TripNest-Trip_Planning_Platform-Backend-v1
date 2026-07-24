import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { AuthController } from "../../controller/auth/auth.controller";
import { validate } from "../../shared/middleware/validate.middleware";
import { loginSchema } from "../../validation/auth/login.schema";
import { googleAuthSchema } from "@/validation/auth/google-auth.schema";

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
      "/google",
      validate(googleAuthSchema),
      this.authController.googleAuth.bind(this.authController),
    );

    this.router.post("/refresh-token", this.authController.refreshToken.bind(this.authController));

    this.router.post("/logout", this.authController.logout.bind(this.authController));
  }
}
