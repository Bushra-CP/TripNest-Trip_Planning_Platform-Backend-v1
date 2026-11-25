export type OperatingHoursStatus = "AVAILABLE" | "CLOSED" | "UNKNOWN" | "OPEN_24_HOURS";

export interface OperatingPeriod {
  day: number;
  dayName: string;
  openingTime: string;
  closingTime: string;
}

export interface SeasonalClosure {
  isClosed: boolean;
  months: string[];
  reason: string | null;
}

export interface AttractionOperatingHours {
  placeName: string;

  openingTime?: string | undefined;
  closingTime?: string | undefined;
  lastEntryTime?: string | undefined;

  closedDays: string[];

  regularOpeningHours?: string[] | undefined;
  operatingPeriods?: OperatingPeriod[] | undefined;

  seasonalClosure?: SeasonalClosure | undefined;
  sourceUrls?: string[] | undefined;
  confidence?: "unverified" | "verified" | undefined;

  source?: string | undefined;
  verified: boolean;
  status: OperatingHoursStatus;

  unavailableReason?: string | undefined;
}

export interface OperatingHoursRequest {
  placeName: string;
  travelDate?: string | undefined;
}
