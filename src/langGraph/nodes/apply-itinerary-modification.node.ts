import type { TripGraphState } from "@/langGraph/trip-graph.state";
import type { IItineraryDay } from "@/interfaces/IModel/trip-planning/itinerary.model.interfaces";
import type { PendingItineraryChange } from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";
import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

import { ItineraryModificationValidationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-validation.service";
import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";

export const createApplyItineraryModificationNode = (
  itineraryService: IItineraryService,
  validationService: ItineraryModificationValidationService,
  itineraryGenerationService: ItineraryGenerationService,
) => {
  return async (state: TripGraphState): Promise<Partial<TripGraphState>> => {
    try {
      if (
        state.confirmationStatus !== "CONFIRMED" ||
        !state.itineraryRequested ||
        state.itineraryAction !== "MODIFY" ||
        !state.pendingItineraryChange ||
        !state.modificationFeasibility
      ) {
        return {
          response:
            "I haven't changed your saved itinerary because the required confirmation or modification details are missing.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      if (!state.tripId || !state.threadId) {
        return {
          response:
            "I couldn't identify your current trip. Your saved itinerary has not been modified.",
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      const changes: PendingItineraryChange = state.pendingItineraryChange;

      console.log("PENDING ITINERARY CHANGE:", JSON.stringify(changes, null, 2));

      // Revalidate against the latest saved itinerary.
      const validation = await validationService.validateModification(
        state.tripId,
        state.threadId,
        changes,
      );

      if (!validation.isValid || !validation.itinerary) {
        return {
          response: [
            "I couldn't apply the requested changes because the itinerary no longer satisfies the validation checks.",
            ...validation.errors.map((error) => `• ${error}`),
            "",
            "Your saved itinerary has not been modified. Please review your request and try again.",
          ].join("\n"),
          itineraryRequested: false,
          itineraryAction: null,
          confirmationStatus: null,
          pendingItineraryChange: null,
          modificationFeasibility: null,
        };
      }

      const itinerary = validation.itinerary;
      console.log("VALIDATED ITINERARY RAW DATA:", JSON.stringify(validation.itinerary, null, 2));

      const normalize = (name: unknown): string =>
        typeof name === "string" ? name.trim().toLowerCase().replace(/\s+/g, " ") : "";

      const fail = (message: string): Partial<TripGraphState> => ({
        response: message,
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
        modificationFeasibility: null,
      });

      // Work on independent copies. The saved itinerary is not changed
      // until updateItinerary is called at the end.
      const updatedDays: IItineraryDay[] = itinerary.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
        stops: day.stops.map((stop) => ({
          name: stop.name,
          description: stop.description,
          ...(stop.activityType !== undefined && {
            activityType: stop.activityType,
          }),
          ...(stop.location !== undefined && {
            location: stop.location,
          }),
          ...(stop.startTime !== undefined && {
            startTime: stop.startTime,
          }),
          ...(stop.durationMinutes !== undefined && {
            durationMinutes: stop.durationMinutes,
          }),
        })),
      }));

      console.log(
        "ITINERARY LOADED FOR MODIFICATION:",
        JSON.stringify(
          {
            tripId: state.tripId,
            threadId: state.threadId,
            days: updatedDays.map((day) => ({
              dayNumber: day.dayNumber,
              stops: day.stops.map((stop) => ({
                name: stop.name,
                startTime: stop.startTime,
              })),
            })),
          },
          null,
          2,
        ),
      );

      const findStopLocations = (name: string, dayNumber?: number) =>
        updatedDays.flatMap((day) =>
          day.stops.flatMap((stop, index) =>
            normalize(stop.name) === normalize(name) &&
            (dayNumber === undefined || day.dayNumber === dayNumber)
              ? [{ day, index, stop }]
              : [],
          ),
        );

      const findUniqueStop = (name: string, dayNumber?: number) => {
        console.log("\n========== FIND UNIQUE STOP DEBUG ==========");
        console.log("Requested stop name:", JSON.stringify(name));
        console.log("Normalized requested name:", JSON.stringify(normalize(name)));
        console.log("Requested day number:", dayNumber);

        console.log(
          "All available stops:",
          JSON.stringify(
            updatedDays.flatMap((day) =>
              day.stops.map((stop) => ({
                dayNumber: day.dayNumber,
                name: stop.name,
                normalizedName: normalize(stop.name),
              })),
            ),
            null,
            2,
          ),
        );

        const matches = findStopLocations(name, dayNumber);

        console.log(
          "Matching stops:",
          JSON.stringify(
            matches.map((match) => ({
              dayNumber: match.day.dayNumber,
              name: match.stop.name,
              index: match.index,
            })),
            null,
            2,
          ),
        );

        console.log("Number of matches:", matches.length);
        console.log("============================================\n");

        if (matches.length === 0) {
          throw new Error(`"${name}" could not be found in the requested itinerary.`);
        }

        if (matches.length > 1) {
          throw new Error(
            `"${name}" appears more than once. Please specify which day contains the destination.`,
          );
        }

        return matches[0]!;
      };

      const generateStop = async (placeName: string, dayNumber: number, preferredTime?: string) => {
        const existingStops = updatedDays.find((day) => day.dayNumber === dayNumber)?.stops ?? [];

        return itineraryGenerationService.generateStopDetails(
          placeName,
          itinerary.destinations.join(", "),
          dayNumber,
          itinerary.travelMode,
          itinerary.tripType,
          itinerary.preferences,
          existingStops.map((stop) => ({
            name: stop.name,
            ...(stop.startTime !== undefined && { startTime: stop.startTime }),
          })),
          preferredTime,
        );
      };

      // Track destinations that are being removed or replaced so that
      // later operations cannot silently invalidate insertion anchors.
      const affectedNames = new Set<string>();

      for (const place of changes.removePlaces) {
        affectedNames.add(normalize(place.name));
      }

      for (const replacement of changes.replacePlaces) {
        affectedNames.add(normalize(replacement.remove));
      }

      for (const place of changes.addPlaces) {
        const anchors = [place.insertBefore, place.insertAfter].filter((anchor): anchor is string =>
          Boolean(anchor?.trim()),
        );

        for (const anchor of anchors) {
          if (affectedNames.has(normalize(anchor))) {
            return fail(
              `The insertion anchor "${anchor}" is also being removed or replaced in this request. Please choose a different anchor or separate the changes into multiple requests.`,
            );
          }
        }
      }

      // Apply replacements first. Each replacement retains its original
      // array position, and the user's preferred visiting time is passed
      // to the stop-generation service.
      for (const replacement of changes.replacePlaces) {
        const { day, index } = findUniqueStop(replacement.remove, replacement.dayNumber);

        const duplicateExists = updatedDays.some((candidateDay) =>
          candidateDay.stops.some(
            (stop) =>
              normalize(stop.name) === normalize(replacement.add) &&
              normalize(stop.name) !== normalize(replacement.remove),
          ),
        );

        if (duplicateExists) {
          return fail(
            `"${replacement.add}" is already included in your itinerary. Your saved itinerary has not been modified.`,
          );
        }

        const replacementStop = await generateStop(
          replacement.add.trim(),
          day.dayNumber,
          replacement.preferredTime,
        );

        // Replace only the selected occurrence.
        day.stops[index] = replacementStop;
      }

      // Apply removals. Remove only the selected occurrence.
      for (const place of changes.removePlaces) {
        const { day, index } = findUniqueStop(place.name, place.dayNumber);

        day.stops.splice(index, 1);
      }

      // Apply additions in their requested positions.
      for (const place of changes.addPlaces) {
        const alreadyExists = updatedDays.some((day) =>
          day.stops.some((stop) => normalize(stop.name) === normalize(place.name)),
        );

        if (alreadyExists) {
          return fail(
            `"${place.name}" is already included in your itinerary. Your saved itinerary has not been modified.`,
          );
        }

        const hasInsertBefore = Boolean(place.insertBefore?.trim());
        const hasInsertAfter = Boolean(place.insertAfter?.trim());

        if (hasInsertBefore && hasInsertAfter) {
          return fail(
            `The requested position for "${place.name}" is ambiguous because both insertBefore and insertAfter are specified. Please clarify the intended position.`,
          );
        }

        let targetDay: IItineraryDay | undefined;
        let insertionIndex: number | undefined;

        if (hasInsertBefore && place.insertBefore) {
          const anchor = findUniqueStop(place.insertBefore);

          targetDay = anchor.day;
          insertionIndex = anchor.index;
        } else if (hasInsertAfter && place.insertAfter) {
          const anchor = findUniqueStop(place.insertAfter);

          targetDay = anchor.day;
          insertionIndex = anchor.index + 1;
        } else {
          targetDay =
            place.dayNumber === undefined
              ? updatedDays[updatedDays.length - 1]
              : updatedDays.find((day) => day.dayNumber === place.dayNumber);

          if (!targetDay) {
            return fail(
              `I couldn't identify a valid day for "${place.name}". Your saved itinerary has not been modified.`,
            );
          }

          // Without an anchor, append to the requested day.
          insertionIndex = targetDay.stops.length;
        }

        if (!targetDay || insertionIndex === undefined) {
          return fail(
            `I couldn't determine where to insert "${place.name}". Your saved itinerary has not been modified.`,
          );
        }

        // An explicitly requested day must agree with the anchor's day.
        if (place.dayNumber !== undefined && place.dayNumber !== targetDay.dayNumber) {
          return fail(
            `"${place.name}" was requested for Day ${place.dayNumber}, but its insertion anchor is on Day ${targetDay.dayNumber}. Your saved itinerary has not been modified.`,
          );
        }

        // Generate stop details before inserting the stop.
        const newStop = await generateStop(
          place.name.trim(),
          targetDay.dayNumber,
          place.preferredTime,
        );

        targetDay.stops.splice(insertionIndex, 0, newStop);
      }

      // Persist only after every requested operation succeeds.
      const updatedItinerary = await itineraryService.updateItinerary({
        tripId: state.tripId,
        threadId: state.threadId,
        title: itinerary.title,
        days: updatedDays,
      });

      const appliedChanges: string[] = [];

      for (const place of changes.removePlaces) {
        appliedChanges.push(
          `• Removed ${place.name}${
            place.dayNumber !== undefined ? ` from Day ${place.dayNumber}` : ""
          }`,
        );
      }

      for (const replacement of changes.replacePlaces) {
        appliedChanges.push(
          `• Replaced ${replacement.remove} with ${replacement.add}${
            replacement.dayNumber !== undefined ? ` on Day ${replacement.dayNumber}` : ""
          }${
            replacement.preferredTime
              ? `, with the requested visiting time "${replacement.preferredTime}"`
              : ""
          }`,
        );
      }

      for (const place of changes.addPlaces) {
        const position = place.insertBefore
          ? ` immediately before ${place.insertBefore}`
          : place.insertAfter
            ? ` immediately after ${place.insertAfter}`
            : "";

        const finalDay =
          place.dayNumber ??
          updatedDays.find((day) =>
            day.stops.some((stop) => normalize(stop.name) === normalize(place.name)),
          )?.dayNumber;

        appliedChanges.push(
          `• Added ${place.name}${position}${finalDay !== undefined ? ` on Day ${finalDay}` : ""}${
            place.preferredTime ? `, with the requested visiting time "${place.preferredTime}"` : ""
          }`,
        );
      }

      return {
        response: [
          "Your itinerary has been updated successfully!",
          "",
          "Applied changes:",
          ...appliedChanges,
        ].join("\n"),
        generatedItinerary: {
          title: updatedItinerary.title,
          days: updatedItinerary.days,
        },
        itineraryGeneratedNow: false,
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
        modificationFeasibility: null,
      };
    } catch (error) {
      console.error("APPLY ITINERARY MODIFICATION ERROR:", error);

      return {
        response:
          error instanceof Error
            ? `${error.message} Your saved itinerary has not been modified.`
            : "Something went wrong while updating your itinerary. Please check your saved itinerary before retrying.",
        itineraryRequested: false,
        itineraryAction: null,
        confirmationStatus: null,
        pendingItineraryChange: null,
        modificationFeasibility: null,
      };
    }
  };
};
