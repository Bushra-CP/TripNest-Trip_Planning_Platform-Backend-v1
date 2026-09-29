import type { TripRequirements, TripStop } from "@/interfaces/trip-planning/trip.interfaces";
import { injectable } from "inversify";

@injectable()
export class TripStateService {
  /**
   * Creates an empty trip state.
   * This is the state we use when the user
   * starts a completely new conversation.
   */
  public createEmptyState(): TripRequirements {
    return {
      source: null,
      destinations: [],
      startDate: null,
      totalDays: null,
      numberOfTravelers: null,
      budget: null,
      travelMode: null,
      tripType: null,
      preferences: [],
      additionalDetails: [],
    };
  }

  /**
   * Merges newly extracted information into the existing trip state.
   * currentState = information from previous messages
   * newRequirements = information from latest message
   */
  public mergeState(
    currentState: TripRequirements,
    newRequirements: TripRequirements,
    destinationOrderChanged: boolean = false,
  ): TripRequirements {
    return {
      // Use the new source if it exists.
      // Otherwise keep the previous source.
      source: newRequirements.source ?? currentState.source,

      // Merge all destinations together.
      destinations: destinationOrderChanged
        ? newRequirements.destinations
        : this.mergeDestinations(currentState.destinations, newRequirements.destinations),

      // Keep the old value if the new message does not provide a value.
      startDate: newRequirements.startDate ?? currentState.startDate,

      totalDays: newRequirements.totalDays ?? currentState.totalDays,

      numberOfTravelers: newRequirements.numberOfTravelers ?? currentState.numberOfTravelers,

      budget: newRequirements.budget ?? currentState.budget,

      travelMode: newRequirements.travelMode ?? currentState.travelMode,

      tripType: newRequirements.tripType ?? currentState.tripType,

      // Combine preferences from old and new messages.
      preferences: this.mergeStringArrays(currentState.preferences, newRequirements.preferences),

      // Combine additional details too.
      additionalDetails: this.mergeStringArrays(
        currentState.additionalDetails,
        newRequirements.additionalDetails,
      ),
    };
  }

  /**
   * Merges destination lists.
   * If a destination already exists, we update
   * its number of days when the new message provides it.
   */
  private mergeDestinations(
    currentDestinations: TripStop[],
    newDestinations: TripStop[],
  ): TripStop[] {
    const mergedDestinations = [...currentDestinations];

    for (const newDestination of newDestinations) {
      const existingDestination = mergedDestinations.find(
        (destination) => destination.name.toLowerCase() === newDestination.name.toLowerCase(),
      );

      // Destination already exists.
      if (existingDestination) {
        // Only replace days if the new message actually contains a value.
        if (newDestination.days !== null) {
          existingDestination.days = newDestination.days;
        }

        continue;
      }

      // This is a completely new destination.
      mergedDestinations.push({
        name: newDestination.name,
        days: newDestination.days,
      });
    }

    return mergedDestinations;
  }

  /**
   * Combines two string arrays and removes duplicates.
   */
  private mergeStringArrays(currentValues: string[], newValues: string[]): string[] {
    return [...new Set([...currentValues, ...newValues])];
  }
}
