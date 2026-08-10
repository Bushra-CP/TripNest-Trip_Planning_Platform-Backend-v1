import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { STATUS_CODES } from "../../enums/status.codes.enum";
import { SuccessMessages } from "@/enums/messages.enum";
import { GetUsersRequestDto, UserStatus } from "@/dtos/admin/user-management/users.dto";
import { TYPES } from "@/di/types";
import { IUserManagementService } from "@/interfaces/IServices/admin/IUserManagementService";
import { ResponseHandler } from "@/shared/http/responseHandler";

@injectable()
export class UserManagementController {
  constructor(
    @inject(TYPES.UserManagementService)
    private readonly userManagementService: IUserManagementService,
  ) {}

  /*-----------------------
  GET USERS
  ------------------------*/
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: GetUsersRequestDto = {
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string | undefined,
        status: req.query.status as UserStatus | undefined,
      };

      const data = await this.userManagementService.getUsers(query);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.USERS_FETCHED, data);
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  GET USER USING ID
  ------------------------*/
  async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.userManagementService.getUserDetails(req.params.id as string);

      ResponseHandler.success(res, STATUS_CODES.OK, "", data);
    } catch (error) {
      next(error);
    }
  }

  /*-----------------------
  UPDATE USER STATUS 
  ------------------------*/
  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.userManagementService.updateUserStatus({
        userId: req.params.id as string,
        isActive: req.body.isActive,
      });

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.USER_STATUS_UPDATED, data);
    } catch (error) {
      next(error);
    }
  }
}
