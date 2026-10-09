import { z } from "zod";

import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import type { RoutePlanningResult } from "@/interfaces/trip-planning/route.interfaces";
import type { ChatMessage, RagSource } from "@/interfaces/trip-planning/ai-planning.interfaces";
import { KnowledgeChunkSearchResult } from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import {
  KNOWLEDGE_METADATA_FIELDS,
  KnowledgeMetadataFieldOrNull,
} from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-query-classifier.service";
import { AcquiredKnowledge } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-acquisition.service";
import {
  ConfirmationStatus,
  ItineraryAction,
  PendingItineraryChange,
} from "@/interfaces/trip-planning/itinerary/itinerary.interfaces";

export interface TripGraphState {
  // User message
  userMessage: string;

  // Trip title
  title: string | null;

  // Previous and current requirements
  previousTripRequirements: TripRequirements;
  tripRequirements: TripRequirements;

  // Conversation
  conversationHistory: ChatMessage[];

  // Route
  route: RoutePlanningResult | null;

  // Trip status
  missingFields: string[];
  isComplete: boolean;
  canGenerateDraft: boolean;

  // Route change
  routeChanged: boolean;
  destinationOrderChanged: boolean;

  // Knowledge
  currentKnowledgeDestination: string | null;
  ragContext: KnowledgeChunkSearchResult[]; //Knowledge retrieved from the RAG system.
  ragSources: RagSource[];

  knowledgeMetadataField: KnowledgeMetadataFieldOrNull;
  knowledgeSufficient: boolean;

  acquiredKnowledge: AcquiredKnowledge | null;

  requestRoute: "knowledge" | "none";

  // Itinerary state
  itineraryRequested: boolean;
  itineraryAction: ItineraryAction;
  confirmationStatus: ConfirmationStatus;
  pendingItineraryChange: PendingItineraryChange | null;

  response: string;
}

/*
 * Zod schema for trip requirements.
 */
export const tripRequirementsSchema = z.object({
  source: z.string().nullable(),

  destinations: z.array(
    z.object({
      name: z.string(),
      days: z.number().nullable(),
    }),
  ),

  startDate: z.string().nullable(),
  totalDays: z.number().nullable(),
  numberOfTravelers: z.number().nullable(),
  budget: z.number().nullable(),
  travelMode: z.string().nullable(),
  tripType: z.string().nullable(),

  preferences: z.array(z.string()),
  additionalDetails: z.array(z.string()),
});

/*
 * Empty trip requirements used when a new
 * LangGraph thread is created.
 */
const emptyTripRequirements = {
  title: null,
  source: null,
  destinations: [],
  startDate: null,
  totalDays: null,
  numberOfTravelers: null,
  budget: null,
  travelMode: null,
  tripType: null,
  preferences: [],
  additionalDetails: [],
};

/*
 * LangGraph state schema.
 *
 * userMessage is supplied for every invocation.
 *
 * The remaining fields have defaults so that
 * the first message can create the initial state.
 *
 * On subsequent messages, LangGraph restores
 * these values from MongoDB checkpointing.
 */
export const tripGraphStateSchema = {
  userMessage: z.string(),

  title: z.string().nullable().default(null),

  previousTripRequirements: tripRequirementsSchema.default(emptyTripRequirements),

  tripRequirements: tripRequirementsSchema.default(emptyTripRequirements),

  conversationHistory: z.array(z.any()).default([]),

  route: z.any().nullable().default(null),

  missingFields: z.array(z.string()).default([]),

  isComplete: z.boolean().default(false),

  canGenerateDraft: z.boolean().default(false),

  routeChanged: z.boolean().default(false),

  destinationOrderChanged: z.boolean().default(false),

  currentKnowledgeDestination: z.string().nullable().default(null),

  ragContext: z.array(z.any()).default([]), //Knowledge retrieved from the RAG system.

  ragSources: z.array(z.any()).default([]),

  knowledgeMetadataField: z.enum(KNOWLEDGE_METADATA_FIELDS).nullable().default(null),

  knowledgeSufficient: z.boolean().default(false),

  acquiredKnowledge: z
    .object({
      title: z.string(),
      destination: z.string().nullable(),
      category: z.string(),
      content: z.string(),
      documentId: z.string(),
    })
    .nullable()
    .default(null),

  requestRoute: z.enum(["knowledge", "none"]).default("none"),

  itineraryRequested: z.boolean().default(false),

  itineraryAction: z.enum(["CREATE", "MODIFY"]).nullable().default(null),

  confirmationStatus: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).nullable().default(null),

  pendingItineraryChange: z
    .object({
      removePlaces: z.array(z.string()).default([]),

      addPlaces: z.array(z.string()).default([]),

      replacePlaces: z
        .array(
          z.object({
            remove: z.string(),

            add: z.string(),
          }),
        )
        .default([]),

      description: z.string(),
    })
    .nullable()
    .default(null),

  response: z.string().default(""),
};
