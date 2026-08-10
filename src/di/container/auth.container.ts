import { Container } from "inversify";
import { IAuthRepository } from "../../interfaces/IRepository/auth/IAuth.repository";
import { AuthRepository } from "../../repositories/auth/auth.repository";
import { TYPES } from "../types";
import { AuthService } from "../../services/auth/auth.service";
import { AuthController } from "../../controller/auth/auth.controller";
import { IAuthService } from "../../interfaces/IServices/auth/IAuth.service";
import { AuthRoutes } from "../../routes/auth/auth.routes";

export function authContainer(container: Container): void {
  container.bind<IAuthRepository>(TYPES.AuthRepository).to(AuthRepository);

  container.bind<IAuthService>(TYPES.AuthService).to(AuthService);

  container.bind<AuthController>(TYPES.AuthController).to(AuthController);

  container.bind<AuthRoutes>(TYPES.AuthRoutes).to(AuthRoutes);
}
