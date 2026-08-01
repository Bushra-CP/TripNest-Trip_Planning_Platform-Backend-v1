import { Container } from "inversify";

import { TYPES } from "../types.js";
import { IUserRepository } from "../../interfaces/IRepository/user(traveler)/profile/IUserRepository.js";
import { UserRepository } from "../../repositories/user(traveler)/profile/userRepository.js";
import { ITravelerProfileRepository } from "../../interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository.js";
import { TravelerProfileRepository } from "../../repositories/user(traveler)/profile/travelerProfileRepository.js";
import { ITravelerProfileService } from "../../interfaces/IServices/user(traveler)/ITravelerProfileService.js";
import { TravelerProfileController } from "../../controller/user(traveler)/traveler-profile.controller.js";
import { TravelerProfileService } from "../../services/user(traveler)/traveler-profile.service.js";
import { TravelerProfileRoutes } from "../../routes/user(traveler)/traveler-profile.routes.js";

export function registerUserRegContainer(container: Container): void {
  container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);

  container
    .bind<ITravelerProfileRepository>(TYPES.TravelerProfileRepository)
    .to(TravelerProfileRepository);

  container.bind<ITravelerProfileService>(TYPES.TravelerProfileService).to(TravelerProfileService);

  container
    .bind<TravelerProfileController>(TYPES.TravelerProfileController)
    .to(TravelerProfileController);

  container.bind<TravelerProfileRoutes>(TYPES.TravelerProfileRoutes).to(TravelerProfileRoutes);
}
