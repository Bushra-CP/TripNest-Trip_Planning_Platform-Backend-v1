import { injectable } from "inversify";

import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";

@injectable()
export class TripChangeDetectorService {
  /**
   * Checks whether the route needs to be recalculated.
   *
   * A route is affected when:
   * - source changes
   * - destinations change
   * - travel mode changes
   */
  public hasRouteChanged(previousState: TripRequirements, newState: TripRequirements): boolean {
    // Check whether the source changed.
    if (previousState.source !== newState.source) {
      return true;
    }

    // Check whether destinations changed.
    if (!this.areDestinationsEqual(previousState, newState)) {
      return true;
    }

    // Check whether travel mode changed.
    if (previousState.travelMode !== newState.travelMode) {
      return true;
    }

    // Nothing related to the route changed.
    return false;
  }

  /**
   * Compares destinations while preserving their order.
   */
  private areDestinationsEqual(
    previousState: TripRequirements,
    newState: TripRequirements,
  ): boolean {
    const previousDestinations = previousState.destinations;

    const newDestinations = newState.destinations;

    // Different number of destinations means route changed.
    if (previousDestinations.length !== newDestinations.length) {
      return false;
    }

    // Compare each destination in order.
    for (let index = 0; index < previousDestinations.length; index++) {
      const previousDestination = previousDestinations[index];

      const newDestination = newDestinations[index];

      if (previousDestination?.name.toLowerCase() !== newDestination?.name.toLowerCase()) {
        return false;
      }
    }

    return true;
  }
}
