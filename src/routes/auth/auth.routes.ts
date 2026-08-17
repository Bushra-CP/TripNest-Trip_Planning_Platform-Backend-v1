import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { AuthController } from "../../controller/auth/auth.controller";
import { validate } from "../../middleware/validate.middleware";
import { loginSchema } from "../../validation/auth/login.schema";
import { googleAuthSchema } from "@/validation/auth/google-auth.schema";
import { forgotPasswordSchema } from "@/validation/user(traveler)/forgot-password/forgot-password.schema";
import { resetPasswordSchema } from "@/validation/user(traveler)/forgot-password/reset-password.schema";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { UserRole } from "@/enums/user-role.enum";
import { changePasswordSchema } from "@/validation/auth/change-password.schema";
import { changeEmailSchema } from "@/validation/auth/change-email.schema";

@injectable()
export class AuthRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.AuthController)
    private readonly _authController: AuthController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly _authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly _authorizeMiddleware: AuthorizeMiddleware,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/login",
      validate(loginSchema),
      this._authController.login.bind(this._authController),
    );

    this.router.post(
      "/google",
      validate(googleAuthSchema),
      this._authController.googleAuth.bind(this._authController),
    );

    this.router.post(
      "/refresh-token",
      this._authController.refreshToken.bind(this._authController),
    );

    this.router.post("/logout", this._authController.logout.bind(this._authController));

    this.router.post(
      "/forgot-password",
      validate(forgotPasswordSchema),
      this._authController.forgotPassword.bind(this._authController),
    );

    this.router.post(
      "/verify-reset-otp",
      this._authController.verifyResetOtp.bind(this._authController),
    );

    this.router.post(
      "/resend-reset-otp",
      validate(forgotPasswordSchema),
      this._authController.resendResetOtp.bind(this._authController),
    );

    this.router.post(
      "/reset-password",
      validate(resetPasswordSchema),
      this._authController.resetPassword.bind(this._authController),
    );

    this.router.patch(
      "/change-password",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(changePasswordSchema),
      this._authController.changePassword.bind(this._authController),
    );

    this.router.post(
      "/change-email",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(changeEmailSchema),
      this._authController.changeEmail.bind(this._authController),
    );

    this.router.post(
      "/verify-change-email-otp",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._authController.verifyChangeEmailOtp.bind(this._authController),
    );

    this.router.post(
      "/resend-change-email-otp",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._authController.resendChangeEmailOtp.bind(this._authController),
    );
  }
}
