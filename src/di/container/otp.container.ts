import { Container } from "inversify";
import { IOtpRepository } from "../../interfaces/IRepository/user(traveler)/otp/IOtpRepository";
import { TYPES } from "../types";
import { OtpRepository } from "../../repositories/user(traveler)/otp/otp.repository";

export function registerOTP(container: Container): void {
  container.bind<IOtpRepository>(TYPES.OtpRepository).to(OtpRepository);
}
