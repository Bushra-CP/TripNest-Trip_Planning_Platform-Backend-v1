import { inject, injectable } from "inversify";
import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

import { TYPES } from "@/di/types";
import { env } from "@/config/env";

import type { TripGraphState } from "@/langGraph/trip-graph.state";
import { createTripGraph } from "@/langGraph/trip.graph";

import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";
import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import { KnowledgeVectorSearchService } from "../rag/knowledge-vector-search.service";
import { RouteRequestService } from "../route-request.service";

@injectable()
export class TripGraphService {
  private readonly graph: ReturnType<typeof createTripGraph>;

  private readonly checkpointer: MongoDBSaver;

  private readonly checkpointerInitialization: Promise<void>;

  constructor(
    @inject(TYPES.TripExtractionService)
    private readonly _tripExtractionService: TripExtractionService,

    @inject(TYPES.TripDateService)
    private readonly _tripDateService: TripDateService,

    @inject(TYPES.TripStateService)
    private readonly _tripStateService: TripStateService,

    @inject(TYPES.TripChangeDetectorService)
    private readonly _tripChangeDetectorService: TripChangeDetectorService,

    @inject(TYPES.RoutePlanningService)
    private readonly _routePlanningService: RoutePlanningService,

    @inject(TYPES.KnowledgeVectorSearchService)
    private readonly _knowledgeVectorSearchService: KnowledgeVectorSearchService,

    @inject(TYPES.RouteRequestService)
    private readonly _routeRequestService: RouteRequestService,
  ) {
    /*
     * The LangGraph checkpointer stores the graph state after each
     * graph execution, so when the next message arrives with the same
     * threadId, LangGraph can restore the previous state.
     */

    //Create a MongoDB client for LangGraph checkpoint storage.
    const mongoClient = new MongoClient(env.MONGO_URI!);

    // Create the LangGraph checkpointer.
    // It saves and restores graph state for each conversation thread.
    this.checkpointer = new MongoDBSaver({
      client: mongoClient,
      dbName: "TripNest",
    });

    //Initialize the checkpointer.
    this.checkpointerInitialization = this.initializeCheckpointer();

    // Create the trip-planning graph and give it the checkpointer
    // so LangGraph can persist the state of each conversation.
    this.graph = createTripGraph(
      this._tripExtractionService,
      this._tripDateService,
      this._tripStateService,
      this._tripChangeDetectorService,
      this._routePlanningService,
      this._knowledgeVectorSearchService,
      this._routeRequestService,
      this.checkpointer,
    );
  }

  //Initialize the MongoDB checkpoint storage.
  private async initializeCheckpointer(): Promise<void> {
    await this.checkpointer.setup();

    console.log("LangGraph MongoDB checkpointer initialized");
  }

  public async processMessage(userMessage: string, threadId: string): Promise<TripGraphState> {
    await this.checkpointerInitialization;

    const result = await this.graph.invoke(
      {
        userMessage,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    return result;
  }
}
