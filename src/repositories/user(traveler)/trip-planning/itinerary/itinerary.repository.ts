import { injectable } from "inversify";
import { BaseRepository } from "@/repositories/base.repository";
import { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import { IItineraryRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary.repository.interface";
import { ItineraryModel } from "@/models/user(traveler)/trip-planning/itinerary/itinerary.model";

@injectable()
export class ItineraryRepository
  extends BaseRepository<IItinerary>
  implements IItineraryRepository
{
  constructor() {
    super(ItineraryModel);
  }

  public async findByTripId(tripId: string): Promise<IItinerary | null> {
    return this.findOne({ tripId });
  }

  public async findByThreadId(threadId: string): Promise<IItinerary | null> {
    return this.findOne({ threadId });
  }

  public async updateByTripId(
    tripId: string,
    data: Partial<IItinerary>,
  ): Promise<IItinerary | null> {
    return this.updateOne({ tripId }, data);
  }

  public async deleteByTripId(tripId: string): Promise<IItinerary | null> {
    const itinerary = await this.findByTripId(tripId);

    if (!itinerary) {
      return null;
    }

    return this.deleteById(itinerary._id.toString());
  }
}
