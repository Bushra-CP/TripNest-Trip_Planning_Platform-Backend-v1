import { RoutePlanningResult } from "./route.interfaces";
import { TripRequirements } from "./trip.interfaces";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface AIChatResult {
  reply: string; //response shown to the user.
  requirements: TripRequirements;
  missingFields: string[];
  isComplete: boolean;
  canGenerateDraft: boolean;

  // Route information generated from the current trip state.
  route: RoutePlanningResult | null;
}
