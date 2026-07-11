import { Container } from "inversify";

import { TYPES } from "./types";

import { IAuthRepository } from "../../features/auth/interfaces/IAuthRepository";

import { AuthRepository } from "../../features/auth/repository/AuthRepository";

import { AuthService } from "../../features/auth/service/AuthService";

import { AuthController } from "../../features/auth/controller/AuthController";

import { AuthRoutes } from "../../features/auth/routes/AuthRoutes";

export function registerAuth(container: Container): void {

    container
        .bind<IAuthRepository>(TYPES.AuthRepository)
        .to(AuthRepository);

    container
        .bind<AuthService>(TYPES.AuthService)
        .to(AuthService);

    container
        .bind<AuthController>(TYPES.AuthController)
        .to(AuthController);

    container
        .bind<AuthRoutes>(TYPES.AuthRoutes)
        .to(AuthRoutes);

}