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
    private readonly travelerProfileController: TravelerProfileController,

    @inject(TYPES.AuthenticateMiddleware)
    private readonly authenticateMiddleware: AuthenticateMiddleware,

    @inject(TYPES.AuthorizeMiddleware)
    private readonly authorizeMiddleware: AuthorizeMiddleware,
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

    this.router.patch(
      "/update-profile-image",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.TRAVELER),
      uploadProfileImage.single("profileImage"),
      this.travelerProfileController.updateProfileImage.bind(this.travelerProfileController),
    );

    this.router.get(
      "/get-profile",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.TRAVELER),
      this.travelerProfileController.getProfile.bind(this.travelerProfileController),
    );

    this.router.patch(
      "/update-profile",
      this.authenticateMiddleware.authenticate,
      this.authorizeMiddleware.authorize(UserRole.TRAVELER),
      validate(updateTravelerProfileSchema),
      this.travelerProfileController.updateProfile.bind(this.travelerProfileController),
    );
  }
}
