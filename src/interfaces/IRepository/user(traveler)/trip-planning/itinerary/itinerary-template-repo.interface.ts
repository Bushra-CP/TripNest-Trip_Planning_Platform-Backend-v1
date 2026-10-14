import { IItineraryTemplate } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { IBaseRepository } from "@/interfaces/IRepository/IBaseRepository";

export interface IItineraryTemplateRepository extends IBaseRepository<IItineraryTemplate> {
  findActiveById(id: string): Promise<IItineraryTemplate | null>;
}
