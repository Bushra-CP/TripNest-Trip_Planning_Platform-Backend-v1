import { Router } from "express";
import { TYPES } from "@/di/types";
import { inject, injectable } from "inversify";
import { validate } from "@/shared/middleware/validate.middleware";
import { forgotPasswordSchema } from "@/validation/user(traveler)/forgot-password/forgot-password.schema";
import { verifyResetOtpSchema } from "@/validation/user(traveler)/forgot-password/verify-reset-otp.schema";
import { resetPasswordSchema } from "@/validation/user(traveler)/forgot-password/reset-password.schema";
import { ForgotPasswordController } from "@/controller/user(traveler)/forgot-password/forgot-password.controller";

@injectable()
export class ForgotPasswordRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.ForgotPasswordController)
    private readonly forgotPasswordController: ForgotPasswordController,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/forgot-password",
      validate(forgotPasswordSchema),
      this.forgotPasswordController.forgotPassword,
    );

    this.router.post(
      "/verify-reset-otp",
      validate(verifyResetOtpSchema),
      this.forgotPasswordController.verifyResetOtp,
    );

    this.router.post(
      "/resend-reset-otp",
      validate(forgotPasswordSchema),
      this.forgotPasswordController.resendResetOtp,
    );

    this.router.post(
      "/reset-password",
      validate(resetPasswordSchema),
      this.forgotPasswordController.resetPassword,
    );
  }
}
