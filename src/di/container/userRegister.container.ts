import { Container } from "inversify";

import { TYPES } from "../types.js";
import type { IUserRepository } from "../../features/traveler/register/interfaces/IUserRepository.js";
import { UserRepository } from "../../features/traveler/register/repositories/userRepository.js";
import type { ITravelerProfileRepository } from "../../features/traveler/register/interfaces/ITravelerProfileRepository.js";
import { TravelerProfileRepository } from "../../features/traveler/register/repositories/travelerProfileRepository.js";
import type { ITravelerProfileService } from "../../features/traveler/register/interfaces/ITravelerProfileService.js";
import { TravelerProfileService } from "../../features/traveler/register/services/traveler-profile.service.js";
import { TravelerProfileController } from "../../features/traveler/register/controller/traveler-profile.controller.js";
import { TravelerProfileRoutes } from "../../features/traveler/register/routes/traveler-profile.routes.js";

export function registerUserRegContainer(container: Container): void {
  container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);

  container
    .bind<ITravelerProfileRepository>(TYPES.TravelerProfileRepository)
    .to(TravelerProfileRepository);

  container
    .bind<ITravelerProfileService>(TYPES.TravelerProfileService)
    .to(TravelerProfileService);

  container
    .bind<TravelerProfileController>(TYPES.TravelerProfileController)
    .to(TravelerProfileController);

  container
    .bind<TravelerProfileRoutes>(TYPES.TravelerProfileRoutes)
    .to(TravelerProfileRoutes);
}
