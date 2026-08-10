import { Container } from "inversify";

import { TYPES } from "../types";
import { UserManagementController } from "@/controller/admin/user.controller";
import { UserManagementRoutes } from "@/routes/admin/admin.routes";
import { IAdminUserRepository } from "@/interfaces/IRepository/admin/user-management/IAdminUserRepository";
import { AdminUserRepository } from "@/repositories/admin/user-management/user.repository";
import { IUserManagementService } from "@/interfaces/IServices/admin/IUserManagementService";
import { UserManagementService } from "@/services/admin/user-management/user.service";

export function registerUserManagementContainer(container: Container): void {
  container.bind<IAdminUserRepository>(TYPES.UserManagementRepository).to(AdminUserRepository);

  container.bind<IUserManagementService>(TYPES.UserManagementService).to(UserManagementService);

  container
    .bind<UserManagementController>(TYPES.UserManagementController)
    .to(UserManagementController);

  container.bind<UserManagementRoutes>(TYPES.UserManagementRoutes).to(UserManagementRoutes);
}
