import { Container } from "inversify";
import { TYPES } from "../types";
import { AIPlanningController } from "@/controller/user(traveler)/ai-planning.controller";
import { AIPlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/ai-planning.service";
import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import { TravelModeMapper } from "@/mapper/travel-mode.mapper";
import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";

export function registerAIPlanning(container: Container): void {
  container.bind(TYPES.AIPlanningService).to(AIPlanningService);
  container.bind(TYPES.TripExtractionService).to(TripExtractionService);
  container.bind(TYPES.TripStateService).to(TripStateService);
  container.bind(TYPES.TripDateService).to(TripDateService);
  container.bind(TYPES.RoutePlanningService).to(RoutePlanningService);
  container.bind(TYPES.TravelModeMapper).to(TravelModeMapper);
  container.bind(TYPES.TripChangeDetectorService).to(TripChangeDetectorService);
  container.bind(TYPES.AIPlanningController).to(AIPlanningController);
}
