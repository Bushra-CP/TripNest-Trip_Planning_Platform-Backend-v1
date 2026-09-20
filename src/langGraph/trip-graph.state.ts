import { z } from "zod";

import type { TripRequirements } from "@/interfaces/trip-planning/trip.interfaces";
import type { RoutePlanningResult } from "@/interfaces/trip-planning/route.interfaces";
import type { ChatMessage } from "@/interfaces/trip-planning/ai-planning.interfaces";

export interface TripGraphState {
  userMessage: string;
  previousTripRequirements: TripRequirements;
  tripRequirements: TripRequirements;
  conversationHistory: ChatMessage[];
  route: RoutePlanningResult | null;
  missingFields: string[];
  isComplete: boolean;
  canGenerateDraft: boolean;
  routeChanged: boolean;
  destinationOrderChanged: boolean;
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

  previousTripRequirements: tripRequirementsSchema.default(emptyTripRequirements),

  tripRequirements: tripRequirementsSchema.default(emptyTripRequirements),

  conversationHistory: z.array(z.any()).default([]),

  route: z.any().nullable().default(null),

  missingFields: z.array(z.string()).default([]),

  isComplete: z.boolean().default(false),

  canGenerateDraft: z.boolean().default(false),

  routeChanged: z.boolean().default(false),

  destinationOrderChanged: z.boolean().default(false),

  response: z.string().default(""),
};
