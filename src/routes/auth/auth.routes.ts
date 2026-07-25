import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { AuthController } from "../../controller/auth/auth.controller";
import { validate } from "../../shared/middleware/validate.middleware";
import { loginSchema } from "../../validation/auth/login.schema";
import { googleAuthSchema } from "@/validation/auth/google-auth.schema";
import { forgotPasswordSchema } from "@/validation/user(traveler)/forgot-password/forgot-password.schema";
// import { verifyResetOtpSchema } from "@/validation/user(traveler)/forgot-password/verify-reset-otp.schema";
import { resetPasswordSchema } from "@/validation/user(traveler)/forgot-password/reset-password.schema";

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

    this.router.post(
      "/forgot-password",
      validate(forgotPasswordSchema),
      this.authController.forgotPassword.bind(this.authController),
    );

    this.router.post(
      "/verify-reset-otp",
      this.authController.verifyResetOtp.bind(this.authController),
    );

    this.router.post(
      "/resend-reset-otp",
      validate(forgotPasswordSchema),
      this.authController.resendResetOtp.bind(this.authController),
    );

    this.router.post(
      "/reset-password",
      validate(resetPasswordSchema),
      this.authController.resetPassword.bind(this.authController),
    );
  }
}
