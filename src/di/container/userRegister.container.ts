import { Container } from "inversify";

import { TYPES } from "../types.js";
import { IUserRepository } from "../../interfaces/IRepository/user(traveler)/register/IUserRepository.js";
import { UserRepository } from "../../repositories/user(traveler)/register/userRepository.js";
import { ITravelerProfileRepository } from "../../interfaces/IRepository/user(traveler)/register/ITravelerProfileRepository.js";
import { TravelerProfileRepository } from "../../repositories/user(traveler)/register/travelerProfileRepository.js";
import { ITravelerProfileService } from "../../interfaces/IServices/user(traveler)/ITravelerProfileService.js";
import { TravelerProfileController } from "../../controller/user(traveler)/register/traveler-profile.controller.js";
import { TravelerProfileService } from "../../services/user(traveler)/register/traveler-profile.service.js";
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
