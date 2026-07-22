import { Container } from "inversify";
import { IAuthRepository } from "../../interfaces/IRepository/auth/IAuth.repository.js";
import { AuthRepository } from "../../repositories/auth/auth.repository.js";
import { TYPES } from "../types.js";
import { AuthService } from "../../services/auth/auth.service.js";
import { AuthController } from "../../controller/auth/auth.controller.js";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service.js";
import { AuthRoutes } from "../../routes/auth/auth.routes.js";

export function authContainer(container: Container): void {
  container.bind<IAuthRepository>(TYPES.AuthRepository).to(AuthRepository);

  container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

  container.bind<AuthController>(TYPES.AuthController).to(AuthController);

  container.bind<AuthRoutes>(TYPES.AuthRoutes).to(AuthRoutes);
}
