import { IOtp } from "../../../IModel/IOtp.js";
import { IBaseRepository } from "../../IBaseRepository.js";

export interface IOtpRepository extends IBaseRepository<IOtp> {
  findByUserId(userId: string): Promise<IOtp | null>;

  deleteByUserId(userId: string): Promise<boolean>;
}
