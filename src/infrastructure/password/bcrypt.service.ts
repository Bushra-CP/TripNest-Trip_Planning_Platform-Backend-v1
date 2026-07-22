import bcrypt from "bcrypt";
import { injectable } from "inversify";
import { IPasswordService } from "./IPasswordService.js";
import { env } from "../../config/env.js";

@injectable()
export class PasswordService implements IPasswordService {
  private readonly saltrounds = env.BCRYPT_SALT;

  //hash password
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltrounds);
  }

  //compare passwords
  async compare(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
