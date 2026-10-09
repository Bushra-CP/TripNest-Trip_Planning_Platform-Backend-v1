import { inject, injectable } from "inversify";
import { env } from "@/config/env";
import type {
  GoogleGeocodingApiResponse,
  GoogleRoutesApiResponse,
  RoutePlanningRequest,
  RoutePlanningResult,
  RouteLeg,
  RouteLocation,
} from "@/interfaces/trip-planning/route.interfaces";
import { TYPES } from "@/di/types";
import { TravelModeMapper } from "@/mapper/travel-mode.mapper";

interface LocationDetails {
  city: string;
  state: string;
  country: string;
}

@injectable()
export class RoutePlanningService {
  private readonly routesApiUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

  private readonly geocodingApiUrl = "https://maps.googleapis.com/maps/api/geocode/json";

  constructor(
    @inject(TYPES.TravelModeMapper)
    private readonly _travelModeMapper: TravelModeMapper,
  ) {}

  public async calculateRoute(request: RoutePlanningRequest): Promise<RoutePlanningResult> {
    if (request.destinations.length === 0) {
      throw new Error("At least one destination is required");
    }

    if (!env.GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key is not configured");
    }

    const googleTravelMode = this._travelModeMapper.mapToGoogleMode(request.travelMode ?? null);

    if (request.travelMode && !googleTravelMode) {
      throw new Error(`Google Routes does not support travel mode: ${request.travelMode}`);
    }

    const finalTravelMode = googleTravelMode ?? "DRIVE";

    /*
     * The last destination becomes the final destination.
     * All previous destinations become intermediate stops.
     */
    const destination = request.destinations[request.destinations.length - 1];

    const intermediates = request.destinations.slice(0, -1).map((location) => ({
      address: location,
    }));

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
     * Get route from Google Routes API
     */
    const response = await fetch(this.routesApiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,

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

    if (!response.ok) {
      const errorMessage = await response.text();

      throw new Error(`Google Routes API request failed: ${response.status} ${errorMessage}`);
    }

    const data = (await response.json()) as GoogleRoutesApiResponse;

    const route = data.routes?.[0];

    if (!route) {
      throw new Error("No route was found for the given locations");
    }

    const googleLegs = route.legs ?? [];

    /*
     * Names of the locations entered by the user.
     *
     * Example:
     *
     * source = Palakkad
     * destinations = [Wayanad, Mysore]
     *
     * waypointNames =
     * [Palakkad, Wayanad, Mysore]
     */
    const waypointNames = [request.source, ...request.destinations];

    /*
     * // Collect all unique coordinates
     *
     * We don't want to call Google Geocoding separately for
     * every start/end location.
     *
     * Example:
     *
     * Leg 1:
     * Palakkad -> Wayanad
     *
     * Leg 2:
     * Wayanad -> Mysore
     *
     * Wayanad appears twice, so we only geocode it once.
     */

    const coordinateMap = new Map<
      string,
      {
        latitude: number;
        longitude: number;
      }
    >();

    for (const leg of googleLegs) {
      const startLocation = leg.startLocation?.latLng;
      const endLocation = leg.endLocation?.latLng;

      if (!startLocation || !endLocation) {
        throw new Error("Route location coordinates are missing");
      }

      const startKey = this.createCoordinateKey(startLocation.latitude, startLocation.longitude);

      const endKey = this.createCoordinateKey(endLocation.latitude, endLocation.longitude);

      coordinateMap.set(startKey, {
        latitude: startLocation.latitude,
        longitude: startLocation.longitude,
      });

      coordinateMap.set(endKey, {
        latitude: endLocation.latitude,
        longitude: endLocation.longitude,
      });
    }

    /*
     * // Reverse geocode unique coordinates
     *
     * Map:
     *
     * "10.7867,76.6548"
     *        ↓
     * {
     *   city: "Palakkad",
     *   state: "KERALA",
     *   country: "INDIA"
     * }
     */

    const locationDetailsMap = new Map<string, LocationDetails>();

    await Promise.all(
      Array.from(coordinateMap.entries()).map(async ([coordinateKey, coordinates]) => {
        const details = await this.getLocationDetails(coordinates.latitude, coordinates.longitude);

        locationDetailsMap.set(coordinateKey, details);
      }),
    );

    /*
     * // Build route legs
     */

    const legs: RouteLeg[] = googleLegs.map((leg, index) => {
      const startLocation = leg.startLocation?.latLng;
      const endLocation = leg.endLocation?.latLng;

      if (!startLocation || !endLocation) {
        throw new Error("Route location coordinates are missing");
      }

      const startKey = this.createCoordinateKey(startLocation.latitude, startLocation.longitude);

      const endKey = this.createCoordinateKey(endLocation.latitude, endLocation.longitude);

      const startDetails = locationDetailsMap.get(startKey);

      const endDetails = locationDetailsMap.get(endKey);

      if (!startDetails || !endDetails) {
        throw new Error("Unable to resolve route location details");
      }

      return {
        distanceMeters: leg.distanceMeters,

        durationSeconds: this.parseDurationSeconds(leg.duration),

        startLocation: {
          name: waypointNames[index] ?? `Stop ${index + 1}`,

          city: startDetails.city,

          state: startDetails.state,

          country: startDetails.country,

          latitude: startLocation.latitude,

          longitude: startLocation.longitude,
        },

        endLocation: {
          name: waypointNames[index + 1] ?? `Stop ${index + 2}`,

          city: endDetails.city,

          state: endDetails.state,

          country: endDetails.country,

          latitude: endLocation.latitude,

          longitude: endLocation.longitude,
        },
      };
    });

    /*
     * // Build unique route locations
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
     * // Return final route result
     */

    return {
      distanceMeters: route.distanceMeters,

      durationSeconds: this.parseDurationSeconds(route.duration),

      encodedPolyline: route.polyline?.encodedPolyline ?? null,

      locations,

      legs,
    };
  }

  /**
   *
   * Reverse geocode latitude and longitude using Google Geocoding API.
   * @private
   * @param {number} latitude
   * @param {number} longitude
   * @return {*}  {Promise<LocationDetails>}
   * @memberof RoutePlanningService
   */
  private async getLocationDetails(latitude: number, longitude: number): Promise<LocationDetails> {
    const url =
      `${this.geocodingApiUrl}` +
      `?latlng=${latitude},${longitude}` +
      `&key=${env.GOOGLE_MAPS_API_KEY}` +
      `&language=en`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Geocoding API request failed: ${response.status}`);
    }

    const data = (await response.json()) as GoogleGeocodingApiResponse;

    if (data.status !== "OK" || !data.results.length) {
      console.error("Google Geocoding API response:", data);

      throw new Error(`Google Geocoding failed: ${data.status} ${data.error_message ?? ""}`);
    }

    const firstResult = data.results[0];

    if (!firstResult) {
      throw new Error("Unable to resolve location");
    }

    const components = firstResult.address_components;

    const city =
      components.find((component) => component.types.includes("locality"))?.long_name ??
      components.find((component) => component.types.includes("administrative_area_level_2"))
        ?.long_name;

    const state = components.find((component) =>
      component.types.includes("administrative_area_level_1"),
    )?.long_name;

    const country = components.find((component) => component.types.includes("country"))?.long_name;

    if (!city || !state || !country) {
      throw new Error("Unable to determine city, state or country");
    }

    return {
      city,

      state: state.toUpperCase(),

      country: country.toUpperCase(),
    };
  }

  /**
   * Creates a normalized key for coordinates.
   *
   * @private
   * @param {number} latitude
   * @param {number} longitude
   * @return {*}  {string}
   * @memberof RoutePlanningService
   */
  private createCoordinateKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }

  /**
   * Converts Google's duration format.
   * Example:
   * "3600s" -> 3600
   *
   * @private
   * @param {string} duration
   * @return {*}  {number}
   * @memberof RoutePlanningService
   */
  private parseDurationSeconds(duration: string): number {
    return Number.parseFloat(duration.replace("s", ""));
  }
}
