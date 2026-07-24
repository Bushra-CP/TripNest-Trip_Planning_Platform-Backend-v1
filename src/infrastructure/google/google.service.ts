import axios from "axios";
import { injectable } from "inversify";
import { GoogleUserInfo, IGoogleService } from "./IGoogleService";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

@injectable()
export class GoogleService implements IGoogleService {
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch {
      throw new AppError(STATUS_CODES.UNAUTHORIZED, ErrorMessages.INVALID_GOOGLE_TOKEN);
    }
  }
}
