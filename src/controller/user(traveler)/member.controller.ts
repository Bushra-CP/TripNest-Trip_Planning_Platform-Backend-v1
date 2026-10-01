import { TYPES } from "@/di/types";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { IMemberService } from "@/interfaces/IServices/user(traveler)/trip-planning/member.service.interface";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class MemberController {
  constructor(
    @inject(TYPES.MemberService)
    private readonly _memberService: IMemberService,
  ) {}

  /**
   * JOIN GROUP
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof MemberController
   */
  createTripMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roomId } = req.body;
      const userId = req.user.userId;

      if (!roomId) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "roomId is required");
        return;
      }

      const member = await this._memberService.createTripMember({ roomId }, userId);

      ResponseHandler.success(
        res,
        STATUS_CODES.CREATED,
        "Trip member created successfully",
        member,
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * UPDATE ROLE
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof MemberController
   */
  updateTripMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threadId, role } = req.body;
      const userId = req.user.userId;

      if (!threadId || !role) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "threadId and role are required");
        return;
      }

      if (role !== "MEMBER" && role !== "GUEST") {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "Invalid member role");
        return;
      }

      const member = await this._memberService.updateTripMember(
        {
          threadId,
          role,
        },
        userId,
      );

      ResponseHandler.success(res, STATUS_CODES.OK, "Trip member updated successfully", member);
    } catch (error) {
      next(error);
    }
  };

  /**
   * LEAVE GROUP
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof MemberController
   */
  deleteTripMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threadId } = req.body;
      const userId = req.user.userId;

      if (!threadId) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "threadId is required");
        return;
      }

      await this._memberService.deleteTripMember(threadId, userId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Trip member deleted successfully");
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET ALL MEMBERS
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @memberof MemberController
   */
  getTripMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threadId } = req.params;

      if (typeof threadId !== "string" || !threadId.trim()) {
        ResponseHandler.error(res, STATUS_CODES.BAD_REQUEST, "threadId is required");
        return;
      }

      const members = await this._memberService.getTripMembers(threadId);

      ResponseHandler.success(res, STATUS_CODES.OK, "Trip members fetched successfully", members);
    } catch (error) {
      next(error);
    }
  };
}
