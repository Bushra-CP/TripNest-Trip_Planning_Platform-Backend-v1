import { inject, injectable } from "inversify";

import { TYPES } from "@/di/types";
import type { IItinerary } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import type { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";
import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

export interface ItineraryModificationValidationResult {
  isValid: boolean;
  errors: string[];
  itinerary: IItinerary | null;
}

@injectable()
export class ItineraryModificationValidationService {
  constructor(
    @inject(TYPES.ItineraryService)
    private readonly _itineraryService: IItineraryService,
  ) {}

  public async validateModification(
    tripId: string,
    threadId: string,
    changes: PendingItineraryChange,
  ): Promise<ItineraryModificationValidationResult> {
    const itinerary = await this._itineraryService.getItineraryByTripId(tripId, threadId);
    console.log("VALIDATION SERVICE - RAW ITINERARY:", JSON.stringify(itinerary, null, 2));

    console.log("VALIDATION SERVICE - FIRST STOP:", itinerary?.days?.[0]?.stops?.[0]);

    if (!itinerary) {
      return {
        isValid: false,
        errors: ["No existing itinerary was found to modify."],
        itinerary: null,
      };
    }

    const errors: string[] = [];

    const normalize = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

    const findPlace = (name: string, dayNumber?: number) =>
      itinerary.days.flatMap((day) =>
        day.stops
          .filter(
            (stop) =>
              normalize(stop.name) === normalize(name) &&
              (dayNumber === undefined || day.dayNumber === dayNumber),
          )
          .map((stop) => ({
            name: stop.name,
            dayNumber: day.dayNumber,
          })),
      );

    const validateDayNumber = (dayNumber: number | undefined, context: string): void => {
      if (dayNumber !== undefined && !itinerary.days.some((day) => day.dayNumber === dayNumber)) {
        errors.push(`Day ${dayNumber} specified for ${context} does not exist in this itinerary.`);
      }
    };

    // Validate removals.
    for (const place of changes.removePlaces) {
      const matches = findPlace(place.name, place.dayNumber);

      if (matches.length === 0) {
        errors.push(
          place.dayNumber !== undefined
            ? `"${place.name}" was not found on Day ${place.dayNumber}.`
            : `"${place.name}" was not found in the itinerary.`,
        );
      } else if (matches.length > 1) {
        errors.push(
          `"${place.name}" appears more than once in the itinerary. Specify the day to remove the correct occurrence.`,
        );
      }

      validateDayNumber(place.dayNumber, `"${place.name}"`);
    }

    // Validate additions and their requested insertion positions.
    for (const place of changes.addPlaces) {
      const existingMatches = findPlace(place.name);

      if (existingMatches.length > 0) {
        errors.push(
          `"${place.name}" is already included in the itinerary${
            place.dayNumber !== undefined
              ? ` (currently on Day ${existingMatches.map((match) => match.dayNumber).join(", ")}).`
              : "."
          }`,
        );
      }

      validateDayNumber(place.dayNumber, `"${place.name}"`);

      const hasInsertBefore = Boolean(place.insertBefore?.trim());
      const hasInsertAfter = Boolean(place.insertAfter?.trim());

      // Reject contradictory placement instructions.
      // The user should clarify the intended insertion position.
      if (hasInsertBefore && hasInsertAfter) {
        errors.push(
          `The requested position for "${place.name}" specifies both before "${place.insertBefore}" and after "${place.insertAfter}". Please clarify the intended insertion position.`,
        );

        continue;
      }

      if (hasInsertBefore && place.insertBefore) {
        const anchors = findPlace(place.insertBefore);

        if (anchors.length === 0) {
          errors.push(
            `The insertion anchor "${place.insertBefore}" for "${place.name}" was not found in the itinerary.`,
          );
        } else if (anchors.length > 1) {
          errors.push(
            `The insertion anchor "${place.insertBefore}" appears more than once. Specify which occurrence you mean.`,
          );
        } else {
          const anchor = anchors[0];

          if (anchor && place.dayNumber !== undefined && anchor.dayNumber !== place.dayNumber) {
            errors.push(
              `"${place.name}" is assigned to Day ${place.dayNumber}, but "${place.insertBefore}" is on Day ${anchor.dayNumber}. The insertion day and anchor day must match.`,
            );
          }
        }

        if (normalize(place.name) === normalize(place.insertBefore)) {
          errors.push(`"${place.name}" cannot be inserted before itself.`);
        }
      }

      if (hasInsertAfter && place.insertAfter) {
        const anchors = findPlace(place.insertAfter);

        if (anchors.length === 0) {
          errors.push(
            `The insertion anchor "${place.insertAfter}" for "${place.name}" was not found in the itinerary.`,
          );
        } else if (anchors.length > 1) {
          errors.push(
            `The insertion anchor "${place.insertAfter}" appears more than once. Specify which occurrence you mean.`,
          );
        } else {
          const anchor = anchors[0];

          if (anchor && place.dayNumber !== undefined && anchor.dayNumber !== place.dayNumber) {
            errors.push(
              `"${place.name}" is assigned to Day ${place.dayNumber}, but "${place.insertAfter}" is on Day ${anchor.dayNumber}. The insertion day and anchor day must match.`,
            );
          }
        }

        if (normalize(place.name) === normalize(place.insertAfter)) {
          errors.push(`"${place.name}" cannot be inserted after itself.`);
        }
      }
    }

    // Validate replacements.
    for (const replacement of changes.replacePlaces) {
      const originalMatches = findPlace(replacement.remove, replacement.dayNumber);

      if (originalMatches.length === 0) {
        errors.push(
          replacement.dayNumber !== undefined
            ? `"${replacement.remove}" was not found on Day ${replacement.dayNumber}.`
            : `"${replacement.remove}" was not found in the itinerary.`,
        );
      } else if (originalMatches.length > 1) {
        errors.push(
          `"${replacement.remove}" appears more than once in the itinerary. Specify the day to replace the correct occurrence.`,
        );
      }

      if (normalize(replacement.remove) === normalize(replacement.add)) {
        errors.push(`The replacement "${replacement.add}" is the same as the original place.`);
      }

      const replacementMatches = findPlace(replacement.add);

      if (replacementMatches.length > 0) {
        errors.push(`"${replacement.add}" is already included in the itinerary.`);
      }

      validateDayNumber(replacement.dayNumber, `replacement "${replacement.remove}"`);
    }

    // Prevent the same existing stop from being removed or replaced
    // multiple times in one modification request.
    const affectedPlaces = new Map<string, string>();

    for (const place of changes.removePlaces) {
      const key = `${normalize(place.name)}::${place.dayNumber ?? "*"}`;
      const previous = affectedPlaces.get(key);

      if (previous) {
        errors.push(
          `"${place.name}" is requested for both ${previous} and removal. Resolve the conflicting operations before continuing.`,
        );
      } else {
        affectedPlaces.set(key, "removal");
      }
    }

    for (const replacement of changes.replacePlaces) {
      const key = `${normalize(replacement.remove)}::${replacement.dayNumber ?? "*"}`;
      const previous = affectedPlaces.get(key);

      if (previous) {
        errors.push(
          `"${replacement.remove}" has conflicting modification operations: ${previous} and replacement.`,
        );
      } else {
        affectedPlaces.set(key, "replacement");
      }
    }

    const hasChanges =
      changes.addPlaces.length > 0 ||
      changes.removePlaces.length > 0 ||
      changes.replacePlaces.length > 0;

    if (!hasChanges) {
      errors.push("No itinerary changes were identified.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      itinerary,
    };
  }
}
