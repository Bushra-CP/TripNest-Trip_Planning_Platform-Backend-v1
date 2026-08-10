import { IOtp } from "../../../IModel/IOtp";
import { IBaseRepository } from "../../IBaseRepository";

export interface IOtpRepository extends IBaseRepository<IOtp> {
  findByUserId(userId: string): Promise<IOtp | null>;

  deleteByUserId(userId: string): Promise<boolean>;

  findByEmail(email: string): Promise<IOtp | null>;
}
