import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import { IItineraryTemplate } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { IItineraryTemplateRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-template-repo.interface";
import { ItineraryVectorSearchService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-vector-search.service";

/**
 * connect ItineraryVectorSearchService and ItineraryTemplateRepository.
 *
 * @export
 * @class ItineraryTemplateRetrievalService
 */
@injectable()
export class ItineraryTemplateRetrievalService {
  constructor(
    @inject(TYPES.ItineraryVectorSearchService)
    private readonly _itineraryVectorSearchService: ItineraryVectorSearchService,

    @inject(TYPES.ItineraryTemplateRepository)
    private readonly _itineraryTemplateRepository: IItineraryTemplateRepository,
  ) {}

  public async retrieveTemplates(query: string, limit = 5): Promise<IItineraryTemplate[]> {
    const chunks = await this._itineraryVectorSearchService.search(query, limit);

    if (chunks.length === 0) {
      return [];
    }

    const templateIds = [...new Set(chunks.map((chunk) => chunk.templateId.toString()))];

    const templates: IItineraryTemplate[] = [];

    for (const templateId of templateIds) {
      if (!Types.ObjectId.isValid(templateId)) {
        continue;
      }

      const template = await this._itineraryTemplateRepository.findActiveById(templateId);

      if (template) {
        templates.push(template);
      }
    }

    return templates;
  }
}
