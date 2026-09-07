export type TravelMode = "DRIVE" | "TWO_WHEELER" | "WALK" | "BICYCLE" | "TRANSIT";

export interface RoutePlanningRequest {
  source: string;
  destinations: string[];
  travelMode?: string | null;
}

export interface RouteLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  startLocation: RouteLocation;
  endLocation: RouteLocation;
}

export interface RoutePlanningResult {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string | null;
  locations: RouteLocation[];
  legs: RouteLeg[];
}

// ------------------------------
// Google Routes API response types
// ------------------------------

export interface GoogleLatLng {
  latitude: number;
  longitude: number;
}

export interface GoogleLocation {
  latLng?: GoogleLatLng;
}

export interface GoogleRouteLeg {
  distanceMeters: number;
  duration: string;

  startLocation?: GoogleLocation;
  endLocation?: GoogleLocation;
}

export interface GoogleRoute {
  distanceMeters: number;
  duration: string;

  polyline?: {
    encodedPolyline?: string;
  };

  legs?: GoogleRouteLeg[];
}

export interface GoogleRoutesApiResponse {
  routes?: GoogleRoute[];
}
