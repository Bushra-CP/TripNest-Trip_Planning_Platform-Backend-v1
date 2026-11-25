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

    if (!itinerary) {
      return {
        isValid: false,
        errors: ["No existing itinerary was found to modify."],
        itinerary: null,
      };
    }

    const errors: string[] = [];

    const normalize = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

    // Find an attraction in the itinerary.
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

    // Validate whether a requested day exists.
    const validateDayNumber = (dayNumber: number | undefined, context: string): void => {
      if (dayNumber !== undefined && !itinerary.days.some((day) => day.dayNumber === dayNumber)) {
        errors.push(`Day ${dayNumber} specified for ${context} does not exist in this itinerary.`);
      }
    };

    // ==================================================
    // VALIDATE REMOVALS
    // ==================================================

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

    // ==================================================
    // VALIDATE ADDITIONS
    // ==================================================

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

    // ==================================================
    // VALIDATE REPLACEMENTS
    // ==================================================

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

    // ==================================================
    // VALIDATE MOVES
    // ==================================================

    for (const move of changes.movePlaces) {
      const { name, fromDayNumber, toDayNumber } = move;

      // Source and destination must be different.
      if (fromDayNumber === toDayNumber) {
        errors.push(
          `"${name}" is already on Day ${fromDayNumber}. Please select a different destination day.`,
        );

        continue;
      }

      // Validate source day.
      validateDayNumber(fromDayNumber, `the source of "${name}"`);

      // Validate destination day.
      validateDayNumber(toDayNumber, `the destination of "${name}"`);

      // Check whether the attraction exists on the source day.
      const sourceMatches = findPlace(name, fromDayNumber);

      if (sourceMatches.length === 0) {
        errors.push(`"${name}" was not found on Day ${fromDayNumber}.`);
      } else if (sourceMatches.length > 1) {
        errors.push(
          `"${name}" appears more than once on Day ${fromDayNumber}. Please clarify which occurrence you want to move.`,
        );
      }

      // Ensure the destination day exists before checking its anchors.
      const destinationDayExists = itinerary.days.some((day) => day.dayNumber === toDayNumber);

      const hasInsertBefore = Boolean(move.insertBefore?.trim());
      const hasInsertAfter = Boolean(move.insertAfter?.trim());

      // Both insertion positions cannot be specified together.
      if (hasInsertBefore && hasInsertAfter) {
        errors.push(
          `The requested position for "${name}" specifies both before "${move.insertBefore}" and after "${move.insertAfter}". Please clarify the intended position.`,
        );

        continue;
      }

      // Validate insertBefore.
      if (hasInsertBefore && move.insertBefore && destinationDayExists) {
        const anchors = findPlace(move.insertBefore, toDayNumber);

        if (anchors.length === 0) {
          errors.push(
            `The destination anchor "${move.insertBefore}" was not found on Day ${toDayNumber}.`,
          );
        } else if (anchors.length > 1) {
          errors.push(
            `The destination anchor "${move.insertBefore}" appears more than once on Day ${toDayNumber}.`,
          );
        }

        if (normalize(name) === normalize(move.insertBefore)) {
          errors.push(`"${name}" cannot be moved before itself.`);
        }
      }

      // Validate insertAfter.
      if (hasInsertAfter && move.insertAfter && destinationDayExists) {
        const anchors = findPlace(move.insertAfter, toDayNumber);

        if (anchors.length === 0) {
          errors.push(
            `The destination anchor "${move.insertAfter}" was not found on Day ${toDayNumber}.`,
          );
        } else if (anchors.length > 1) {
          errors.push(
            `The destination anchor "${move.insertAfter}" appears more than once on Day ${toDayNumber}.`,
          );
        }

        if (normalize(name) === normalize(move.insertAfter)) {
          errors.push(`"${name}" cannot be moved after itself.`);
        }
      }

      console.log("[MOVE VALIDATION]", {
        name,
        fromDayNumber,
        toDayNumber,
        sourceMatches: sourceMatches.length,
        insertBefore: move.insertBefore,
        insertAfter: move.insertAfter,
      });
    }

    // ==================================================
    // VALIDATE CONFLICTING OPERATIONS
    // ==================================================

    type AffectedOperation = {
      name: string;
      dayNumber?: number | undefined;
      operation: string;
    };

    const affectedOperations: AffectedOperation[] = [];

    for (const place of changes.removePlaces) {
      affectedOperations.push({
        name: place.name,
        dayNumber: place.dayNumber,
        operation: "removal",
      });
    }

    for (const replacement of changes.replacePlaces) {
      affectedOperations.push({
        name: replacement.remove,
        dayNumber: replacement.dayNumber,
        operation: "replacement",
      });
    }

    for (const move of changes.movePlaces) {
      affectedOperations.push({
        name: move.name,
        dayNumber: move.fromDayNumber,
        operation: "move",
      });
    }

    // The same attraction cannot be removed, replaced or moved
    // multiple times in one modification request.
    for (let i = 0; i < affectedOperations.length; i++) {
      const current = affectedOperations[i];

      if (!current) {
        continue;
      }

      for (let j = i + 1; j < affectedOperations.length; j++) {
        const other = affectedOperations[j];

        if (!other) {
          continue;
        }

        const sameName = normalize(current.name) === normalize(other.name);

        const sameOccurrence =
          current.dayNumber === undefined ||
          other.dayNumber === undefined ||
          current.dayNumber === other.dayNumber;

        if (sameName && sameOccurrence) {
          errors.push(
            `"${current.name}" has conflicting operations: ${current.operation} and ${other.operation}. Please separate or clarify these changes.`,
          );
        }
      }
    }

    // ==================================================
    // VALIDATE MOVE ANCHORS AGAINST OTHER OPERATIONS
    // ==================================================

    for (const move of changes.movePlaces) {
      const anchors = [move.insertBefore, move.insertAfter].filter((anchor): anchor is string =>
        Boolean(anchor?.trim()),
      );

      for (const anchor of anchors) {
        const affectedAnchor = affectedOperations.find(
          (operation) =>
            normalize(operation.name) === normalize(anchor) &&
            (operation.dayNumber === undefined || operation.dayNumber === move.toDayNumber),
        );

        if (affectedAnchor) {
          errors.push(
            `The destination anchor "${anchor}" is also being ${affectedAnchor.operation} in this request. Please choose a different anchor or separate the modifications.`,
          );
        }
      }
    }

    // ==================================================
    // VALIDATE WHETHER ANY CHANGES EXIST
    // ==================================================

    const hasChanges =
      changes.addPlaces.length > 0 ||
      changes.removePlaces.length > 0 ||
      changes.replacePlaces.length > 0 ||
      changes.movePlaces.length > 0;

    if (!hasChanges) {
      errors.push("No itinerary changes were identified.");
    }

    console.log(
      "[ITINERARY MODIFICATION VALIDATION RESULT]",
      JSON.stringify(
        {
          isValid: errors.length === 0,
          errors,
        },
        null,
        2,
      ),
    );

    return {
      isValid: errors.length === 0,
      errors,
      itinerary,
    };
  }
}
