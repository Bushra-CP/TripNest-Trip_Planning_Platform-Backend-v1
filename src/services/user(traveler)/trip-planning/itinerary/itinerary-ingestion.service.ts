import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import { TYPES } from "@/di/types";
import type { IItineraryRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary.repository.interface";
import type { IItineraryTemplateRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-template-repo.interface";
import type { IItineraryChunkRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/itinerary/itinerary-chunk-repo.interface";
import { DocumentEmbeddingService } from "@/services/admin/ai/rag/doc-chunk-processing/document-embedding.service";

@injectable()
export class ItineraryIngestionService {
  constructor(
    @inject(TYPES.ItineraryRepository)
    private readonly _itineraryRepository: IItineraryRepository,

    @inject(TYPES.ItineraryTemplateRepository)
    private readonly _itineraryTemplateRepository: IItineraryTemplateRepository,

    @inject(TYPES.ItineraryChunkRepository)
    private readonly _itineraryChunkRepository: IItineraryChunkRepository,

    @inject(TYPES.DocumentEmbeddingService)
    private readonly _documentEmbeddingService: DocumentEmbeddingService,
  ) {}

  public async processItinerary(itineraryId: string): Promise<void> {
    console.log(`[Itinerary Ingestion] Starting processing for itinerary: ${itineraryId}`);

    if (!Types.ObjectId.isValid(itineraryId)) {
      throw new Error("Invalid itinerary ID");
    }

    // 1. Retrieve the saved personal itinerary.
    const itinerary = await this._itineraryRepository.findById(itineraryId);

    if (!itinerary) {
      throw new Error(`Itinerary not found: ${itineraryId}`);
    }

    console.log("[Itinerary Ingestion] Personal itinerary retrieved:", {
      itineraryId: itinerary._id.toString(),
      title: itinerary.title,
      source: itinerary.source,
      destinations: itinerary.destinations,
      totalDays: itinerary.totalDays,
      numberOfDays: itinerary.days.length,
      templateId: itinerary.templateId?.toString() ?? null,
    });

    // Avoid creating another template if this itinerary was already ingested.
    if (itinerary.templateId) {
      const existingTemplate = await this._itineraryTemplateRepository.findActiveById(
        itinerary.templateId.toString(),
      );

      if (existingTemplate) {
        console.log(
          `[Itinerary Ingestion] Active template already exists: ${existingTemplate._id.toString()}. Skipping ingestion.`,
        );

        return;
      }
    }

    // 2. Create the shared itinerary template.
    const template = await this._itineraryTemplateRepository.create({
      title: itinerary.title,
      source: itinerary.source,
      destinations: itinerary.destinations,
      totalDays: itinerary.totalDays,
      travelMode: itinerary.travelMode,
      tripType: itinerary.tripType,
      preferences: itinerary.preferences,
      mustVisitPlaces: itinerary.mustVisitPlaces,
      preferredActivities: itinerary.preferredActivities,
      excludedPlaces: itinerary.excludedPlaces,
      excludedActivityTypes: itinerary.excludedActivityTypes,
      days: itinerary.days,
      version: itinerary.version,
      isActive: true,
    });

    console.log("[Itinerary Ingestion] Template created:", {
      templateId: template._id.toString(),
      title: template.title,
      version: template.version,
    });

    // 3. Associate the personal itinerary with its shared template.
    await this._itineraryRepository.updateById(itineraryId, {
      templateId: template._id,
    });

    console.log(
      `[Itinerary Ingestion] Template ${template._id.toString()} associated with itinerary ${itineraryId}`,
    );

    if (itinerary.days.length === 0) {
      return;
    }

    // 4. Prepare one text chunk for each itinerary day.
    const contents = itinerary.days.map((day) => {
      const stops = day.stops
        .map(
          (stop) =>
            `${stop.name}${stop.activityType ? ` (${stop.activityType})` : ""}: ${stop.description}${
              stop.location ? ` Location: ${stop.location}` : ""
            }`,
        )
        .join("\n");

      return [
        `Itinerary: ${itinerary.title}`,
        `Source: ${itinerary.source}`,
        `Destinations: ${itinerary.destinations.join(", ")}`,
        `Total days: ${itinerary.totalDays}`,
        `Travel mode: ${itinerary.travelMode}`,
        `Trip type: ${itinerary.tripType}`,
        `Preferences: ${itinerary.preferences.join(", ")}`,
        `Must-visit places: ${itinerary.mustVisitPlaces.join(", ")}`,
        `Preferred activities: ${itinerary.preferredActivities.join(", ")}`,
        `Excluded places: ${itinerary.excludedPlaces.join(", ")}`,
        `Excluded activity types: ${itinerary.excludedActivityTypes.join(", ")}`,
        `Day ${day.dayNumber}: ${day.title}`,
        day.description,
        `Stops:\n${stops}`,
      ].join("\n");
    });

    console.log("[Itinerary Ingestion] Chunks prepared:", {
      templateId: template._id.toString(),
      chunkCount: contents.length,
    });

    console.log(`[Itinerary Ingestion] Generating embeddings for ${contents.length} chunks`);

    // 5. Generate embeddings using the existing embedding service.
    const embeddings = await this._documentEmbeddingService.generateDocumentEmbeddings(contents);

    console.log(`[Itinerary Ingestion] Embeddings generated successfully: ${embeddings.length}`);

    if (embeddings.length !== contents.length) {
      throw new Error("The number of embeddings does not match the number of chunks");
    }

    // 6. Prepare the itinerary chunks.
    const chunks = contents.map((content, index) => {
      const embedding = embeddings[index];

      if (!embedding) {
        throw new Error(`Missing embedding for itinerary day ${index + 1}`);
      }

      return {
        templateId: template._id as Types.ObjectId,
        version: template.version,
        chunkIndex: index,
        content,
        embedding,
        metadata: {
          source: template.source,
          destinations: template.destinations,
          totalDays: template.totalDays,
          travelMode: template.travelMode,
          tripType: template.tripType,
          preferences: template.preferences,
          mustVisitPlaces: template.mustVisitPlaces,
          preferredActivities: template.preferredActivities,
          excludedPlaces: template.excludedPlaces,
          excludedActivityTypes: template.excludedActivityTypes,
        },
        isActive: true,
      };
    });

    console.log(
      `[Itinerary Ingestion] Saving ${chunks.length} chunks for template ${template._id.toString()}`,
    );
    // 7. Save the chunks in itinerary_chunks.
    await this._itineraryChunkRepository.insertMany(chunks);

    console.log(
      `[Itinerary Ingestion] Successfully saved ${chunks.length} chunks for template ${template._id.toString()}`,
    );
  }
}
