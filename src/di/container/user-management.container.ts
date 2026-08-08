import { Container } from "inversify";

import { TYPES } from "../types.js";
import { UserManagementController } from "@/controller/admin/user.controller.js";
import { UserManagementRoutes } from "@/routes/admin/admin.routes.js";
import { IAdminUserRepository } from "@/interfaces/IRepository/admin/user-management/IAdminUserRepository.js";
import { AdminUserRepository } from "@/repositories/admin/user-management/user.repository.js";
import { IUserManagementService } from "@/interfaces/IServices/admin/IUserManagementService.js";
import { UserManagementService } from "@/services/admin/user-management/user.service.js";

export function registerUserManagementContainer(container: Container): void {
  container.bind<IAdminUserRepository>(TYPES.UserManagementRepository).to(AdminUserRepository);

  container.bind<IUserManagementService>(TYPES.UserManagementService).to(UserManagementService);

  container
    .bind<UserManagementController>(TYPES.UserManagementController)
    .to(UserManagementController);

  container.bind<UserManagementRoutes>(TYPES.UserManagementRoutes).to(UserManagementRoutes);
}
