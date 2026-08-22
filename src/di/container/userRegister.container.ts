import { Container } from "inversify";

import { TYPES } from "../types";
import { IUserRepository } from "../../interfaces/IRepository/user(traveler)/profile/IUserRepository";
import { UserRepository } from "../../repositories/user(traveler)/profile/user.repository";
import { ITravelerProfileRepository } from "../../interfaces/IRepository/user(traveler)/profile/ITravelerProfileRepository";
import { TravelerProfileRepository } from "../../repositories/user(traveler)/profile/traveler-profile.repository";
import { TravelerProfileController } from "../../controller/user(traveler)/traveler-profile.controller";
import { TravelerProfileService } from "../../services/user(traveler)/profile/traveler-profile.service";
import { TravelerProfileRoutes } from "../../routes/user(traveler)/traveler-profile.routes";
import { ITravelerProfileService } from "@/interfaces/IServices/user(traveler)/ITravelerProfileService";

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
