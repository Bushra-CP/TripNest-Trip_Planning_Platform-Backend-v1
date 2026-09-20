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
  ) {
    const mongoClient = new MongoClient(env.MONGO_URI!);

    this.checkpointer = new MongoDBSaver({
      client: mongoClient,
      dbName: "TripNest",
    });

    this.checkpointerInitialization = this.initializeCheckpointer();

    this.graph = createTripGraph(
      this._tripExtractionService,
      this._tripDateService,
      this._tripStateService,
      this._tripChangeDetectorService,
      this._routePlanningService,
      this.checkpointer,
    );
  }

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
