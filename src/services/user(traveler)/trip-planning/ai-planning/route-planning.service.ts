import { inject, injectable } from "inversify";

import { env } from "@/config/env";

import type {
  GoogleRoutesApiResponse,
  RoutePlanningRequest,
  RoutePlanningResult,
  RouteLeg,
  RouteLocation,
} from "@/interfaces/trip-planning/route.interfaces";

import { TYPES } from "@/di/types";
import { TravelModeMapper } from "@/mapper/travel-mode.mapper";

@injectable()
export class RoutePlanningService {
  // Google Routes API endpoint.
  private readonly routesApiUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

  constructor(
    @inject(TYPES.TravelModeMapper)
    private readonly _travelModeMapper: TravelModeMapper,
  ) {}

  // Calculates a route using Google Routes API.
  public async calculateRoute(request: RoutePlanningRequest): Promise<RoutePlanningResult> {
    // Make sure at least one destination exists.
    if (request.destinations.length === 0) {
      throw new Error("At least one destination is required");
    }

    // Make sure the Google API key is available.
    if (!env.GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key is not configured");
    }

    // Convert our application's travel mode
    // into Google's travel mode.
    const googleTravelMode = this._travelModeMapper.mapToGoogleMode(request.travelMode ?? null);

    if (request.travelMode && !googleTravelMode) {
      throw new Error(`Google Routes does not support travel mode: ${request.travelMode}`);
    }

    const finalTravelMode = googleTravelMode ?? "DRIVE";

    /*
     * Google Routes API expects:
     *
     * origin
     * destination
     * intermediates
     */

    const destination = request.destinations[request.destinations.length - 1];

    const intermediates = request.destinations.slice(0, -1).map((location) => ({
      address: location,
    }));

    /*
     * Build the Google Routes API request.
     */
    const requestBody = {
      origin: {
        address: request.source,
      },

      destination: {
        address: destination,
      },

      ...(intermediates.length > 0 && {
        intermediates,
      }),

      travelMode: finalTravelMode,

      /*
       * Traffic-aware routing is only used for
       * DRIVE and TWO_WHEELER.
       */
      ...(finalTravelMode === "DRIVE" || finalTravelMode === "TWO_WHEELER"
        ? {
            routingPreference: "TRAFFIC_AWARE",
          }
        : {}),

      computeAlternativeRoutes: false,

      units: "METRIC",

      languageCode: "en-US",
    };

    /*
     * Send request to Google Routes API.
     */
    const response = await fetch(this.routesApiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,

        /*
         * Request only the fields we need.
         */
        "X-Goog-FieldMask": [
          "routes.distanceMeters",
          "routes.duration",
          "routes.polyline.encodedPolyline",
          "routes.legs.distanceMeters",
          "routes.legs.duration",
          "routes.legs.startLocation",
          "routes.legs.endLocation",
        ].join(","),
      },

      body: JSON.stringify(requestBody),
    });

    /*
     * Handle Google API errors.
     */
    if (!response.ok) {
      const errorMessage = await response.text();

      throw new Error(`Google Routes API request failed: ${response.status} ${errorMessage}`);
    }

    /*
     * Convert Google's response
     * into a JavaScript object.
     */
    const data = (await response.json()) as GoogleRoutesApiResponse;

    /*
     * We only requested one route.
     */
    const route = data.routes?.[0];

    if (!route) {
      throw new Error("No route was found for the given locations");
    }

    /*
     * Google returns durations like:
     *
     * "31500s"
     *
     * Convert them into numbers.
     */
    const googleLegs = route.legs ?? [];

    /*
     * Names of all route waypoints.
     *
     * Example:
     *
     * source = Mumbai
     * destinations = [Vagamon, Munnar]
     *
     * waypointNames =
     * [Mumbai, Vagamon, Munnar]
     */
    const waypointNames = [request.source, ...request.destinations];

    /*
     * Convert Google's legs into
     * our application's RouteLeg format.
     */
    const legs: RouteLeg[] = googleLegs.map((leg, index) => {
      const startLocation = leg.startLocation?.latLng;

      const endLocation = leg.endLocation?.latLng;

      if (!startLocation || !endLocation) {
        throw new Error("Route location coordinates are missing");
      }

      return {
        distanceMeters: leg.distanceMeters,

        durationSeconds: this.parseDurationSeconds(leg.duration),

        startLocation: {
          name: waypointNames[index] ?? `Stop ${index + 1}`,

          latitude: startLocation.latitude,

          longitude: startLocation.longitude,
        },

        endLocation: {
          name: waypointNames[index + 1] ?? `Stop ${index + 2}`,

          latitude: endLocation.latitude,

          longitude: endLocation.longitude,
        },
      };
    });

    /*
     * Create a simple list of all
     * unique route locations.
     */
    const locations: RouteLocation[] = [];

    for (const leg of legs) {
      if (
        !locations.some(
          (location) =>
            location.latitude === leg.startLocation.latitude &&
            location.longitude === leg.startLocation.longitude,
        )
      ) {
        locations.push(leg.startLocation);
      }

      if (
        !locations.some(
          (location) =>
            location.latitude === leg.endLocation.latitude &&
            location.longitude === leg.endLocation.longitude,
        )
      ) {
        locations.push(leg.endLocation);
      }
    }

    /*
     * Return our application's
     * clean route format.
     */
    return {
      distanceMeters: route.distanceMeters,

      durationSeconds: this.parseDurationSeconds(route.duration),

      encodedPolyline: route.polyline?.encodedPolyline ?? null,

      locations,

      legs,
    };
  }

  // Converts Google's duration string into seconds.
  private parseDurationSeconds(duration: string): number {
    return Number.parseFloat(duration.replace("s", ""));
  }
}
