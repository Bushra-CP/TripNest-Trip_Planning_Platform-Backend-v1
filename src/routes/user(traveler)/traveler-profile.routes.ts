import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { TravelerProfileController } from "../../controller/user(traveler)/register/traveler-profile.controller";
import { validate } from "../../shared/middleware/validate.middleware";
import { registerSchema } from "../../validation/user(traveler)/register/register.schema";
import { verifyRegistrationSchema } from "../../validation/user(traveler)/register/verify-registration.schema";
import { resendOtpSchema } from "../../validation/user(traveler)/register/resend-otp.schema";

@injectable()
export class TravelerProfileRoutes {
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
      this.travelerProfileController.register.bind(this.travelerProfileController),
    );

    this.router.post(
      "/verify-registration",
      validate(verifyRegistrationSchema),
      this.travelerProfileController.verifyRegistration.bind(this.travelerProfileController),
    );

    this.router.post(
      "/resend-otp",
      validate(resendOtpSchema),
      this.travelerProfileController.resendOtp.bind(this.travelerProfileController),
    );
  }
}
