import { injectable } from "inversify";
import { IItineraryTemplateRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-template-repo.interface";
import { BaseRepository } from "@/repositories/base.repository";
import { IItineraryTemplate } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { ItineraryTemplateModel } from "@/models/user(traveler)/trip-planning/itinerary/itinerary-template.model";

@injectable()
export class ItineraryTemplateRepository
  extends BaseRepository<IItineraryTemplate>
  implements IItineraryTemplateRepository
{
  constructor() {
    super(ItineraryTemplateModel);
  }

  public async findActiveById(id: string): Promise<IItineraryTemplate | null> {
    return this.findOne({
      _id: id,
      isActive: true,
    });
  }
}
