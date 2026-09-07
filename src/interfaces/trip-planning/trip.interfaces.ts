export interface TripStop {
  name: string;
  days: number | null;
}

export interface TripRequirements {
  source: string | null;

  // Multiple places can be part of one trip.
  destinations: TripStop[];

  startDate: string | null;
  totalDays: number | null;
  numberOfTravelers: number | null;
  budget: number | null;
  travelMode: string | null; // Car, bike, bus, train, flight, etc.
  tripType: string | null; // Solo, couple, family, friends, etc.

  // Information that doesn't fit the fixed fields.
  preferences: string[];

  // Other useful information provided by the user.
  additionalDetails: string[];
}

export interface TripExtractionResult {
  requirements: TripRequirements;
  missingFields: string[];
  destinationOrderChanged: boolean;
}
