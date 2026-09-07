import { injectable } from "inversify";

import type { TravelMode } from "@/interfaces/trip-planning/route.interfaces";

@injectable()
export class TravelModeMapper {
  public mapToGoogleMode(travelMode: string | null): TravelMode | null {
    if (!travelMode) {
      return null;
    }

    switch (travelMode.trim().toLowerCase()) {
      case "car":
      case "drive":
      case "driving":
        return "DRIVE";

      case "bike":
      case "motorcycle":
      case "two wheeler":
      case "two-wheeler":
        return "TWO_WHEELER";

      case "bicycle":
      case "cycling":
        return "BICYCLE";

      case "walk":
      case "walking":
        return "WALK";

      case "bus":
      case "train":
      case "public transport":
      case "public transit":
        return "TRANSIT";

      case "flight":
      case "fly":
      case "airplane":
      case "plane":
        return null;

      default:
        return null;
    }
  }
}
