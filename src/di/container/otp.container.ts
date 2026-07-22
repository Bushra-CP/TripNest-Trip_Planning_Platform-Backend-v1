import { Container } from "inversify";
import { IOtpRepository } from "../../interfaces/IRepository/user(traveler)/otp/IOtpRepository.js";
import { TYPES } from "../types.js";
import { OtpRepository } from "../../repositories/user(traveler)/otp/otpRepository.js";

export function registerOTP(container: Container): void {
  container.bind<IOtpRepository>(TYPES.OtpRepository).to(OtpRepository);
}
