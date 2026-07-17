import type { Container } from "inversify";
import type { IAuthRepository } from "../../features/auth/interfaces/IAuth.repository.js";
import { AuthRepository } from "../../features/auth/repositories/auth.repository.js";
import { TYPES } from "../types.js";
import type { IAuthService } from "../../features/auth/interfaces/IAuth.service.js";
import { AuthService } from "../../features/auth/services/auth.service.js";
import { AuthController } from "../../features/auth/controller/auth.controller.js";
import { AuthRoutes } from "../../features/auth/routes/auth.routes.js";

export function authContainer(container: Container): void {
  container.bind<IAuthRepository>(TYPES.AuthRepository).to(AuthRepository);

  container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

  container.bind<AuthController>(TYPES.AuthController).to(AuthController);

  container.bind<AuthRoutes>(TYPES.AuthRoutes).to(AuthRoutes);
}
