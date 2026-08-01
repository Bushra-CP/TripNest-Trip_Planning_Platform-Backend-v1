import { ITravelerProfile } from "../../../IModel/ITravelerPofile.js";
import { IBaseRepository } from "../../IBaseRepository.js";

export interface ITravelerProfileRepository extends IBaseRepository<ITravelerProfile> {
  findByUserId(userId: string): Promise<ITravelerProfile | null>;
}
