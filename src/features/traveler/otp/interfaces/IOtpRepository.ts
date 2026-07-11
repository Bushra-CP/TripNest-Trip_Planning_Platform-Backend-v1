import type { IOtp } from "./IOtp.js";

export interface IOtpRepository {
  create(otp: Partial<IOtp>): Promise<IOtp>;

  findByUserId(userId: string): Promise<IOtp | null>;

  deleteByUserId(userId: string): Promise<void>;
}
