import { ITravelerProfile } from "../../../IModel/ITravelerPofile";
import { IBaseRepository } from "../../IBaseRepository";

export interface ITravelerProfileRepository extends IBaseRepository<ITravelerProfile> {
  findByUserId(userId: string): Promise<ITravelerProfile | null>;
}
