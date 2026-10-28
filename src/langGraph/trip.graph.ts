import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import { tripGraphStateSchema } from "./trip-graph.state";

import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";
import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import { KnowledgeVectorSearchService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";
import { RouteRequestService } from "@/services/user(traveler)/trip-planning/ai-planning/route-request.service";
import { KnowledgeQueryClassifierService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-query-classifier.service";
import { KnowledgeSourceService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-source.service";
import { KnowledgeSufficiencyService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-sufficiency.service";
import { KnowledgeAcquisitionService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-acquisition.service";

import { ItineraryIntentService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-intent.service";
import { ItineraryTemplateRetrievalService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-template-retrieval.service";
import { ItineraryGenerationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-generation.service";
import { ItineraryModificationValidationService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-validation.service";
import { ItineraryModificationFeasibilityService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-feasibility.service";

import type { IItineraryService } from "@/interfaces/IServices/user(traveler)/trip-planning/itinerary.service.interface";

import { createExtractRequirementsNode } from "./nodes/extract-requirements.node";
import { createResolveDateNode } from "./nodes/resolve-date.node";
import { createUpdateTripStateNode } from "./nodes/update-trip-state.node";
import { createCheckRouteChangeNode } from "./nodes/check-route-change.node";
import { createCalculateRouteNode } from "./nodes/calculate-route.node";
import { createGenerateResponseNode } from "./nodes/generate-response.node";
import { calculateTripStatus } from "./nodes/calculate-trip-status.node";

import { createRetrieveKnowledgeNode } from "./nodes/retrieve-knowledge.node";
import { createRouteRequestNode } from "./nodes/route-request.node";
import { createCheckKnowledgeSufficiencyNode } from "./nodes/check-knowledge-sufficiency.node";
import { createAcquireKnowledgeNode } from "./nodes/create-acquire-knowledge.node";

import { createDetectItineraryIntentNode } from "./nodes/detect-itinerary-intent.node";
import { createGenerateItineraryNode } from "./nodes/generate-itinerary.node";
import { createValidateItineraryModificationNode } from "./nodes/validate-itinerary-modification.node";
import { createCheckItineraryModificationFeasibilityNode } from "./nodes/check-itinerary-modification-feasibility.node";
import { createApplyItineraryModificationNode } from "./nodes/apply-itinerary-modification.node";

import { routeDecision } from "./route-decision";
import { knowledgeRouteDecision } from "./knowledge-route-decision";
import { knowledgeSufficiencyDecision } from "./knowledge-sufficiency-decision";
import { itineraryGenerationDecision } from "./itinerary-generation-decision";

const TripState = new StateSchema(tripGraphStateSchema);

export const createTripGraph = (
  tripExtractionService: TripExtractionService,
  tripDateService: TripDateService,
  tripStateService: TripStateService,
  tripChangeDetectorService: TripChangeDetectorService,
  routePlanningService: RoutePlanningService,
  knowledgeVectorSearchService: KnowledgeVectorSearchService,
  knowledgeQueryClassifierService: KnowledgeQueryClassifierService,
  knowledgeSourceService: KnowledgeSourceService,
  routeRequestService: RouteRequestService,
  knowledgeSufficiencyService: KnowledgeSufficiencyService,
  knowledgeAcquisitionService: KnowledgeAcquisitionService,
  itineraryIntentService: ItineraryIntentService,
  itineraryTemplateRetrievalService: ItineraryTemplateRetrievalService,
  itineraryGenerationService: ItineraryGenerationService,
  itineraryModificationValidationService: ItineraryModificationValidationService,
  itineraryService: IItineraryService,
  itineraryModificationFeasibilityService: ItineraryModificationFeasibilityService,
  checkpointer: MongoDBSaver,
) => {
  // Existing trip-planning nodes.
  const extractRequirements = createExtractRequirementsNode(tripExtractionService);
  const resolveDate = createResolveDateNode(tripDateService);
  const updateTripState = createUpdateTripStateNode(tripStateService);
  const checkRouteChange = createCheckRouteChangeNode(tripChangeDetectorService);
  const calculateRoute = createCalculateRouteNode(routePlanningService);
  const routeRequest = createRouteRequestNode(routeRequestService);

  const retrieveKnowledge = createRetrieveKnowledgeNode(
    knowledgeVectorSearchService,
    knowledgeQueryClassifierService,
    knowledgeSourceService,
  );

  const checkKnowledgeSufficiency = createCheckKnowledgeSufficiencyNode(
    knowledgeSufficiencyService,
  );

  const acquireKnowledge = createAcquireKnowledgeNode(knowledgeAcquisitionService);

  // Itinerary nodes.
  const detectItineraryIntent = createDetectItineraryIntentNode(itineraryIntentService);

  const generateItinerary = createGenerateItineraryNode(
    itineraryTemplateRetrievalService,
    itineraryGenerationService,
  );

  const validateItineraryModification = createValidateItineraryModificationNode(
    itineraryModificationValidationService,
  );

  const checkItineraryModificationFeasibility = createCheckItineraryModificationFeasibilityNode(
    itineraryService,
    itineraryModificationFeasibilityService,
  );

  const applyItineraryModification = createApplyItineraryModificationNode(
    itineraryService,
    itineraryModificationValidationService,
    itineraryGenerationService,
  );

  const generateResponse = createGenerateResponseNode();

  // Build the workflow.
  const graph = new StateGraph(TripState)
    .addNode("extractRequirements", extractRequirements)
    .addNode("resolveDate", resolveDate)
    .addNode("updateTripState", updateTripState)
    .addNode("calculateTripStatus", calculateTripStatus)
    .addNode("detectItineraryIntent", detectItineraryIntent)
    .addNode("validateItineraryModification", validateItineraryModification)
    .addNode("checkItineraryModificationFeasibility", checkItineraryModificationFeasibility)
    .addNode("applyItineraryModification", applyItineraryModification)
    .addNode("checkRouteChange", checkRouteChange)
    .addNode("routeRequest", routeRequest)
    .addNode("calculateRoute", calculateRoute)
    .addNode("retrieveKnowledge", retrieveKnowledge)
    .addNode("checkKnowledgeSufficiency", checkKnowledgeSufficiency)
    .addNode("acquireKnowledge", acquireKnowledge)
    .addNode("generateResponse", generateResponse)
    .addNode("generateItinerary", generateItinerary)

    // Start the trip-planning workflow.
    .addEdge(START, "extractRequirements")
    .addEdge("extractRequirements", "resolveDate")
    .addEdge("resolveDate", "updateTripState")
    .addEdge("updateTripState", "calculateTripStatus")
    .addEdge("calculateTripStatus", "detectItineraryIntent")

    // Route itinerary requests.
    .addConditionalEdges("detectItineraryIntent", itineraryGenerationDecision, {
      generateItinerary: "generateItinerary",
      validateItineraryModification: "validateItineraryModification",
      applyItineraryModification: "applyItineraryModification",
      continuePlanning: "checkRouteChange",
      end: END,
    })

    // Validate changes and assess feasibility before asking for confirmation.
    .addEdge("validateItineraryModification", "checkItineraryModificationFeasibility")
    .addEdge("checkItineraryModificationFeasibility", END)

    // Save confirmed itinerary modifications.
    .addEdge("applyItineraryModification", END)

    // Existing route-planning flow.
    .addConditionalEdges("checkRouteChange", routeDecision, {
      calculateRoute: "calculateRoute",
      generateResponse: "routeRequest",
    })

    .addEdge("calculateRoute", "routeRequest")

    // Knowledge retrieval flow.
    .addConditionalEdges("routeRequest", knowledgeRouteDecision, {
      retrieveKnowledge: "retrieveKnowledge",
      generateResponse: "generateResponse",
    })

    .addEdge("retrieveKnowledge", "checkKnowledgeSufficiency")

    .addConditionalEdges("checkKnowledgeSufficiency", knowledgeSufficiencyDecision, {
      generateResponse: "generateResponse",
      acquireKnowledge: "acquireKnowledge",
    })

    .addEdge("acquireKnowledge", "generateResponse")

    // Preserve existing itinerary creation behavior.
    .addEdge("generateItinerary", END)
    .addEdge("generateResponse", END);

  return graph.compile({ checkpointer });
};
