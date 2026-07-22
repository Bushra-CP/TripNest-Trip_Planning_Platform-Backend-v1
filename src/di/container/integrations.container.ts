import { Container } from "inversify";

import { TYPES } from "../types";

import { IPasswordService } from "../../infrastructure/password/IPasswordService.js";
import { IOtpService } from "../../infrastructure/otp/IOtpService.js";
import { IJwtService } from "../../infrastructure/jwt/IJwtService.js";
import { IMailService } from "../../infrastructure/mail/IMailService.js";
import { JwtService } from "../../infrastructure/jwt/jwt.service.js";
import { MailService } from "../../infrastructure/mail/email.service.js";
import { OtpService } from "../../infrastructure/otp/otp.service.js";
import { PasswordService } from "../../infrastructure/password/bcrypt.service.js";

export function registerIntegrationsContainer(container: Container): void {
  container.bind<IJwtService>(TYPES.JwtService).to(JwtService).inSingletonScope();

  container.bind<IMailService>(TYPES.MailService).to(MailService).inSingletonScope();

  container.bind<IOtpService>(TYPES.OtpService).to(OtpService).inSingletonScope();

  container.bind<IPasswordService>(TYPES.PasswordService).to(PasswordService).inSingletonScope();
}
