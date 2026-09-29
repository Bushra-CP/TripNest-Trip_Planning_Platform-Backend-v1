import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { tripGraphStateSchema } from "./trip-graph.state";
import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";
import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import { createExtractRequirementsNode } from "./nodes/extract-requirements.node";
import { createResolveDateNode } from "./nodes/resolve-date.node";
import { createUpdateTripStateNode } from "./nodes/update-trip-state.node";
import { createCheckRouteChangeNode } from "./nodes/check-route-change.node";
import { createCalculateRouteNode } from "./nodes/calculate-route.node";
import { createGenerateResponseNode } from "./nodes/generate-response.node";
import { calculateTripStatus } from "./nodes/calculate-trip-status.node";
import { routeDecision } from "./route-decision";
import { KnowledgeVectorSearchService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";
import { createRetrieveKnowledgeNode } from "./nodes/retrieve-knowledge.node";
import { RouteRequestService } from "@/services/user(traveler)/trip-planning/ai-planning/route-request.service";
import { createRouteRequestNode } from "./nodes/route-request.node";
import { knowledgeRouteDecision } from "./knowledge-route-decision";
import { KnowledgeQueryClassifierService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-query-classifier.service";
import { KnowledgeSourceService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-source.service";
import { createCheckKnowledgeSufficiencyNode } from "./nodes/check-knowledge-sufficiency.node";
import { KnowledgeSufficiencyService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-sufficiency.service";
import { KnowledgeAcquisitionService } from "@/services/user(traveler)/trip-planning/ai-planning/knowledge-acquisition.service";
import { knowledgeSufficiencyDecision } from "./knowledge-sufficiency-decision";
import { createAcquireKnowledgeNode } from "./nodes/create-acquire-knowledge.node";

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
  checkpointer: MongoDBSaver,
) => {
  // Create graph nodes using injected services.
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

  const generateResponse = createGenerateResponseNode();

  // Create the trip-planning workflow.
  const graph = new StateGraph(TripState)

    .addNode("extractRequirements", extractRequirements)

    .addNode("resolveDate", resolveDate)

    .addNode("updateTripState", updateTripState)

    .addNode("calculateTripStatus", calculateTripStatus)

    .addNode("checkRouteChange", checkRouteChange)

    .addNode("routeRequest", routeRequest)

    .addNode("calculateRoute", calculateRoute)

    .addNode("retrieveKnowledge", retrieveKnowledge)

    .addNode("checkKnowledgeSufficiency", checkKnowledgeSufficiency)

    .addNode("acquireKnowledge", acquireKnowledge)

    .addNode("generateResponse", generateResponse)

    // START → Extract requirements
    .addEdge(START, "extractRequirements")

    // Extract requirements → Resolve date
    .addEdge("extractRequirements", "resolveDate")

    // Resolve date → Update trip state
    .addEdge("resolveDate", "updateTripState")

    // Update state → Calculate trip status
    .addEdge("updateTripState", "calculateTripStatus")

    // Calculate status → Check route change
    .addEdge("calculateTripStatus", "checkRouteChange")

    // Decide whether route needs recalculation.
    .addConditionalEdges("checkRouteChange", routeDecision, {
      calculateRoute: "calculateRoute",
      generateResponse: "routeRequest",
    })

    // Route calculation → Request router
    .addEdge("calculateRoute", "routeRequest")

    //Request router decides whether RAG is needed.
    .addConditionalEdges("routeRequest", knowledgeRouteDecision, {
      retrieveKnowledge: "retrieveKnowledge",
      generateResponse: "generateResponse",
    })

    // Retrieved knowledge → checkKnowledgeSufficiency
    .addEdge("retrieveKnowledge", "checkKnowledgeSufficiency")

    .addConditionalEdges("checkKnowledgeSufficiency", knowledgeSufficiencyDecision, {
      generateResponse: "generateResponse",
      acquireKnowledge: "acquireKnowledge",
    })

    .addEdge("acquireKnowledge", "generateResponse")

    // Response → END
    .addEdge("generateResponse", END);

  return graph.compile({ checkpointer });
};
