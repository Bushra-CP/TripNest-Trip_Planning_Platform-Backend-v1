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

const TripState = new StateSchema(tripGraphStateSchema);

export const createTripGraph = (
  tripExtractionService: TripExtractionService,
  tripDateService: TripDateService,
  tripStateService: TripStateService,
  tripChangeDetectorService: TripChangeDetectorService,
  routePlanningService: RoutePlanningService,
  knowledgeVectorSearchService: KnowledgeVectorSearchService,
  routeRequestService: RouteRequestService,
  checkpointer: MongoDBSaver,
) => {
  // Create graph nodes using injected services.
  const extractRequirements = createExtractRequirementsNode(tripExtractionService);

  const resolveDate = createResolveDateNode(tripDateService);

  const updateTripState = createUpdateTripStateNode(tripStateService);

  const checkRouteChange = createCheckRouteChangeNode(tripChangeDetectorService);

  const calculateRoute = createCalculateRouteNode(routePlanningService);

  const routeRequest = createRouteRequestNode(routeRequestService);

  const retrieveKnowledge = createRetrieveKnowledgeNode(knowledgeVectorSearchService);

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

    // Retrieved knowledge → Generate response
    .addEdge("retrieveKnowledge", "generateResponse")

    // Response → END
    .addEdge("generateResponse", END);

  return graph.compile({ checkpointer });
};
