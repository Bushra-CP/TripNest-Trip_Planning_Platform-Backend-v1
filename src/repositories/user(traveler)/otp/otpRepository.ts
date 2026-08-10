import { injectable } from "inversify";
import { IOtpRepository } from "../../../interfaces/IRepository/user(traveler)/otp/IOtpRepository";
import { OtpModel } from "../../../models/user(traveler)/otp.model";
import { BaseRepository } from "../../base.repository";
import { IOtp } from "@/interfaces/IModel/IOtp";

@injectable()
export class OtpRepository extends BaseRepository<IOtp> implements IOtpRepository {
  constructor() {
    super(OtpModel);
  }

  async findByUserId(userId: string): Promise<IOtp | null> {
    return this.findOne({ userId });
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    return this.deleteOne({ userId });
  }

  async findByEmail(email: string): Promise<IOtp | null> {
    return this.findOne({ email });
  }
}
