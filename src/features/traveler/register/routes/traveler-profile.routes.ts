import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../../../di/types.js";
import type { TravelerProfileController } from "../controller/traveler-profile.controller.js";
import { validate } from "../../../../shared/middleware/validate.middleware.js";
import { registerSchema } from "../validation/register.schema.js";
import { verifyRegistrationSchema } from "../validation/verify-registration.schema.js";
import { resendOtpSchema } from "../validation/resend-otp.schema.js";

@injectable()
export class TravelerProfileRoutes{
  public readonly router: Router;

  constructor(
    @inject(TYPES.TravelerProfileController)
    private readonly travelerProfileController: TravelerProfileController,
  ) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/register",
      validate(registerSchema),
      this.travelerProfileController.register.bind(
        this.travelerProfileController,
      ),
    );

    this.router.post(
      "/verify-registration",
      validate(verifyRegistrationSchema),
      this.travelerProfileController.verifyRegistration.bind(
        this.travelerProfileController,
      ),
    );

    this.router.post(
      "/resend-otp",
      validate(resendOtpSchema),
      this.travelerProfileController.resendOtp.bind(
        this.travelerProfileController,
      ),
    );
  }
}
