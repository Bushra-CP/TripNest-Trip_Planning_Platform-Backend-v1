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
import { ItineraryModificationBuilderService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-modification-builder.service";

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
import { createAnswerModificationClarificationNode } from "./nodes/answer-modification-clarification.node";

import { createGenerateAttractionRecommendationsNode } from "./nodes/generate-attraction-recommendations.node";

import { routeDecision } from "./route-decision";
import { knowledgeRouteDecision } from "./knowledge-route-decision";
import { knowledgeSufficiencyDecision } from "./knowledge-sufficiency-decision";
import { itineraryGenerationDecision } from "./itinerary-generation-decision";
import { ItineraryScheduleService } from "@/services/user(traveler)/trip-planning/itinerary/itinerary-schedule.service";

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

  // Itinerary services.
  itineraryIntentService: ItineraryIntentService,
  itineraryTemplateRetrievalService: ItineraryTemplateRetrievalService,
  itineraryGenerationService: ItineraryGenerationService,
  itineraryScheduleService: ItineraryScheduleService,
  itineraryModificationValidationService: ItineraryModificationValidationService,
  itineraryService: IItineraryService,
  itineraryModificationFeasibilityService: ItineraryModificationFeasibilityService,
  itineraryModificationBuilderService: ItineraryModificationBuilderService,

  checkpointer: MongoDBSaver,
) => {
  // ============================================================
  // EXISTING TRIP-PLANNING NODES
  // ============================================================

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

  // ============================================================
  // ITINERARY NODES
  // ============================================================

  const detectItineraryIntent = createDetectItineraryIntentNode(itineraryIntentService);

  const generateItinerary = createGenerateItineraryNode(
    itineraryTemplateRetrievalService,
    itineraryGenerationService,
    itineraryScheduleService,
  );

  const validateItineraryModification = createValidateItineraryModificationNode(
    itineraryModificationValidationService,
  );

  const checkItineraryModificationFeasibility = createCheckItineraryModificationFeasibilityNode(
    itineraryService,
    itineraryModificationFeasibilityService,
    itineraryModificationBuilderService,
  );

  const applyItineraryModification = createApplyItineraryModificationNode(
    itineraryService,
    itineraryModificationValidationService,
  );

  // Answer questions about a proposed itinerary modification.
  const answerModificationClarification = createAnswerModificationClarificationNode();

  // ============================================================
  // ATTRACTION RECOMMENDATION NODE
  // ============================================================

  const generateAttractionRecommendations = createGenerateAttractionRecommendationsNode(
    itineraryService,
    itineraryGenerationService,
  );

  // ============================================================
  // RESPONSE NODE
  // ============================================================

  const generateResponse = createGenerateResponseNode();

  // ============================================================
  // BUILD THE WORKFLOW
  // ============================================================

  const graph = new StateGraph(TripState)

    // Register existing trip-planning nodes.
    .addNode("extractRequirements", extractRequirements)
    .addNode("resolveDate", resolveDate)
    .addNode("updateTripState", updateTripState)
    .addNode("calculateTripStatus", calculateTripStatus)

    // Register itinerary nodes.
    .addNode("detectItineraryIntent", detectItineraryIntent)
    .addNode("generateItinerary", generateItinerary)
    .addNode("validateItineraryModification", validateItineraryModification)
    .addNode("checkItineraryModificationFeasibility", checkItineraryModificationFeasibility)
    .addNode("applyItineraryModification", applyItineraryModification)
    .addNode("answerModificationClarification", answerModificationClarification)

    // Register recommendation node.
    .addNode("generateAttractionRecommendations", generateAttractionRecommendations)

    // Register route-planning nodes.
    .addNode("checkRouteChange", checkRouteChange)
    .addNode("routeRequest", routeRequest)
    .addNode("calculateRoute", calculateRoute)

    // Register knowledge nodes.
    .addNode("retrieveKnowledge", retrieveKnowledge)
    .addNode("checkKnowledgeSufficiency", checkKnowledgeSufficiency)
    .addNode("acquireKnowledge", acquireKnowledge)

    // Register response node.
    .addNode("generateResponse", generateResponse)

    // ============================================================
    // MAIN WORKFLOW
    // ============================================================

    .addEdge(START, "extractRequirements")
    .addEdge("extractRequirements", "resolveDate")
    .addEdge("resolveDate", "updateTripState")
    .addEdge("updateTripState", "calculateTripStatus")
    .addEdge("calculateTripStatus", "detectItineraryIntent")

    // ============================================================
    // ITINERARY ROUTING
    // ============================================================

    .addConditionalEdges("detectItineraryIntent", itineraryGenerationDecision, {
      generateItinerary: "generateItinerary",

      validateItineraryModification: "validateItineraryModification",

      applyItineraryModification: "applyItineraryModification",

      answerModificationClarification: "answerModificationClarification",

      generateAttractionRecommendations: "generateAttractionRecommendations",

      continuePlanning: "checkRouteChange",

      end: END,
    })

    // ============================================================
    // MODIFICATION WORKFLOW
    // ============================================================

    // First validate the requested modification.
    // Continue to feasibility assessment only if validation succeeds.
    .addConditionalEdges(
      "validateItineraryModification",
      (state) => {
        if (
          state.itineraryRequested &&
          state.itineraryAction === "MODIFY" &&
          state.pendingItineraryChange
        ) {
          return "checkFeasibility";
        }

        return "end";
      },
      {
        checkFeasibility: "checkItineraryModificationFeasibility",
        end: END,
      },
    )

    // Feasibility node returns the proposal and asks for confirmation.
    .addEdge("checkItineraryModificationFeasibility", END)

    // Apply only after user confirmation.
    .addEdge("applyItineraryModification", END)

    // Answer clarification questions without changing the proposal.
    .addEdge("answerModificationClarification", END)

    // ============================================================
    // RECOMMENDATION WORKFLOW
    // ============================================================

    .addEdge("generateAttractionRecommendations", END)

    // ============================================================
    // ROUTE-PLANNING WORKFLOW
    // ============================================================

    .addConditionalEdges("checkRouteChange", routeDecision, {
      calculateRoute: "calculateRoute",
      generateResponse: "routeRequest",
    })

    .addEdge("calculateRoute", "routeRequest")

    // ============================================================
    // KNOWLEDGE RETRIEVAL WORKFLOW
    // ============================================================

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

    // ============================================================
    // FINAL EDGES
    // ============================================================

    .addEdge("generateItinerary", END)
    .addEdge("generateResponse", END);

  return graph.compile({ checkpointer });
};
