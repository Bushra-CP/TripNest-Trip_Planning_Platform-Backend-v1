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
  title: string | null;
  requirements: TripRequirements;
  missingFields: string[];
  isComplete: boolean;
  canGenerateDraft: boolean;

  // Route information generated from the current trip state.
  route: RoutePlanningResult | null;

  // Sources used to generate the AI response.
  ragSources: RagSource[];

  threadId: string;
}

//To show source of rag knowledge sources
export interface RagSourceMedia {
  type: "image" | "video";
  url: string;
}

export interface RagSource {
  documentId: string;
  postId: string;
  title: string;
  destination: string;
  media: RagSourceMedia[];
}
