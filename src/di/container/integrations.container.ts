import { Container } from "inversify";

import { TYPES } from "../types";

import { IPasswordService } from "../../infrastructure/password/IPasswordService";
import { IOtpService } from "../../infrastructure/otp/IOtpService";
import { IJwtService } from "../../infrastructure/jwt/IJwtService";
import { IMailService } from "../../infrastructure/mail/IMailService";
import { JwtService } from "../../infrastructure/jwt/jwt.service";
import { MailService } from "../../infrastructure/mail/email.service";
import { OtpService } from "../../infrastructure/otp/otp.service";
import { PasswordService } from "../../infrastructure/password/bcrypt.service";
import { IGoogleService } from "@/infrastructure/google/IGoogleService";
import { GoogleService } from "@/infrastructure/google/google.service";
import { IS3Service } from "@/infrastructure/s3/IS3Service";
import { S3Service } from "@/infrastructure/s3/s3.service";

export function registerIntegrationsContainer(container: Container): void {
  container.bind<IJwtService>(TYPES.JwtService).to(JwtService).inSingletonScope();

  container.bind<IMailService>(TYPES.MailService).to(MailService).inSingletonScope();

  container.bind<IOtpService>(TYPES.OtpService).to(OtpService).inSingletonScope();

  container.bind<IPasswordService>(TYPES.PasswordService).to(PasswordService).inSingletonScope();

  container.bind<IGoogleService>(TYPES.GoogleService).to(GoogleService);

  container.bind<IS3Service>(TYPES.S3Service).to(S3Service);
}
