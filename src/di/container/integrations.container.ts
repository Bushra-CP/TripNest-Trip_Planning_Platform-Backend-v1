import { Container } from "inversify";

import { TYPES } from "../types.js";

import { JwtService } from "../../integrations/jwt/JwtService";

import { MailService } from "../../integrations/mail/MailService";

import { OtpService } from "../../integrations/otp/OtpService";
import type { IPasswordService } from "../../integrations/integrations interfaces/IPasswordService.js";
import { PasswordService } from "../../integrations/bcrypt.service";

export function registerShared(container: Container): void {
  container
    .bind<JwtService>(TYPES.JwtService)
    .to(JwtService)
    .inSingletonScope();

  container
    .bind<MailService>(TYPES.MailService)
    .to(MailService)
    .inSingletonScope();

  container
    .bind<OtpService>(TYPES.OtpService)
    .to(OtpService)
    .inSingletonScope();

  container
    .bind<IPasswordService>(TYPES.PasswordService)
    .to(PasswordService)
    .inSingletonScope();
}
