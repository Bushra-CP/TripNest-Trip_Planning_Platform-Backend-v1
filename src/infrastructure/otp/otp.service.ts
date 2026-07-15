import { injectable } from "inversify";
import type { IOtpService } from "./integrations interfaces/IOtpService.js";

@injectable()
export class OtpService implements IOtpService {
  generateOtp(): string {
    let otp = "";
    const length = 6;

    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }

    return otp;
  }
}
