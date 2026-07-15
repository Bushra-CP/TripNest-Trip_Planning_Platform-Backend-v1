import type { Container } from "inversify";
import type { IOtpRepository } from "../../features/traveler/otp/interfaces/IOtpRepository.js";
import { TYPES } from "../types.js";
import { OtpRepository } from "../../features/traveler/otp/repository/otpRepository.js";

export function registerOTP(container: Container): void {
  container
    .bind<IOtpRepository>(TYPES.OtpRepository)
    .to(OtpRepository);
}
