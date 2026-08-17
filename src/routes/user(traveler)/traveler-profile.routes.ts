import { Router } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../../di/types";
import { TravelerProfileController } from "../../controller/user(traveler)/traveler-profile.controller";
import { validate } from "../../middleware/validate.middleware";
import { registerSchema } from "../../validation/user(traveler)/profile/register.schema";
import { verifyRegistrationSchema } from "../../validation/user(traveler)/profile/verify-registration.schema";
import { resendOtpSchema } from "../../validation/user(traveler)/profile/resend-otp.schema";
import { AuthenticateMiddleware } from "@/middleware/authenticate.middleware";
import { AuthorizeMiddleware } from "@/middleware/authorize.middleware";
import { UserRole } from "@/enums/user-role.enum";
import { uploadProfileImage } from "@/middleware/multer/profile-upload";
import { updateTravelerProfileSchema } from "@/validation/user(traveler)/profile/update-profile.schema";

@injectable()
export class TravelerProfileRoutes {
  public readonly router: Router;

  constructor(
    @inject(TYPES.TravelerProfileController)
    private readonly _travelerProfileController: TravelerProfileController,

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
      "/register",
      validate(registerSchema),
      this._travelerProfileController.register.bind(this._travelerProfileController),
    );

    this.router.post(
      "/verify-registration",
      validate(verifyRegistrationSchema),
      this._travelerProfileController.verifyRegistration.bind(this._travelerProfileController),
    );

    this.router.post(
      "/resend-otp",
      validate(resendOtpSchema),
      this._travelerProfileController.resendOtp.bind(this._travelerProfileController),
    );

    this.router.patch(
      "/update-profile-image",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      uploadProfileImage.single("profileImage"),
      this._travelerProfileController.updateProfileImage.bind(this._travelerProfileController),
    );

    this.router.get(
      "/get-profile",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      this._travelerProfileController.getProfile.bind(this._travelerProfileController),
    );

    this.router.patch(
      "/update-profile",
      this._authenticateMiddleware.authenticate,
      this._authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(updateTravelerProfileSchema),
      this._travelerProfileController.updateProfile.bind(this._travelerProfileController),
    );
  }
}
