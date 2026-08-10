import { Container } from "inversify";

import { TYPES } from "../types";
import { IUserRepository } from "../../interfaces/IRepository/user(traveler)/profile/IUserRepository";
import { UserRepository } from "../../repositories/user(traveler)/profile/userRepository";
import { ITravelerProfileRepository } from "../../interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { TravelerProfileRepository } from "../../repositories/user(traveler)/profile/travelerProfileRepository";
import { ITravelerProfileService } from "../../interfaces/IServices/user(traveler)/ITravelerProfileService";
import { TravelerProfileController } from "../../controller/user(traveler)/traveler-profile.controller";
import { TravelerProfileService } from "../../services/user(traveler)/traveler-profile.service";
import { TravelerProfileRoutes } from "../../routes/user(traveler)/traveler-profile.routes";

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
