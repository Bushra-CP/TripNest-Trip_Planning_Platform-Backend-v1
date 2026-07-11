import { injectable } from "inversify";
import type { IOtpRepository } from "../interfaces/IOtpRepository.js";
import type { IOtp } from "../interfaces/IOtp.js";
import { OtpModel } from "../models/otp.model.js";

@injectable()
export class OtpRepository implements IOtpRepository{

    async create(otp: Partial<IOtp>): Promise<IOtp> {
        const otpDocument=new OtpModel(otp)

        await otpDocument.save()

        return otpDocument
    }

    async findByUserId(userId: string): Promise<IOtp | null> {
        return OtpModel.findOne({userId})
    }

    async deleteByUserId(userId: string): Promise<void> {
        await OtpModel.deleteOne({userId})
    }
}