import { Container } from "inversify";
import { TYPES } from "../types";
import { AIPlanningController } from "@/controller/user(traveler)/ai-planning.controller";
import { AIPlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/ai-planning.service";
import { TripExtractionService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-extraction.service";
import { TripStateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-state.service";
import { TripDateService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-date.service";
import { RoutePlanningService } from "@/services/user(traveler)/trip-planning/ai-planning/route-planning.service";
import { TravelModeMapper } from "@/mapper/travel-mode.mapper";
import { TripChangeDetectorService } from "@/services/user(traveler)/trip-planning/ai-planning/trip-change-detector.service";
import { TripGraphService } from "@/services/user(traveler)/trip-planning/ai-planning/graph/trip-graph.service";
import { DocumentTextExtractionService } from "@/services/admin/ai/rag/doc-chunk-processing/document-text-extraction.service";
import { DocumentChunkingService } from "@/services/admin/ai/rag/doc-chunk-processing/document-chunking.service";
import { DocumentEmbeddingService } from "@/services/admin/ai/rag/doc-chunk-processing/document-embedding.service";
import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";
import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";
import { KnowledgeIngestionService } from "@/services/admin/ai/rag/doc-chunk-processing/knowledge-injestion.service";
import { KnowledgeVectorSearchService } from "@/services/user(traveler)/trip-planning/ai-planning/rag/knowledge-vector-search.service";
import { ChunkMetadataExtractionService } from "@/services/admin/ai/rag/doc-chunk-processing/chunk-metadata-extraction.service";
import { DocumentHashService } from "@/services/admin/ai/rag/doc-chunk-processing/document-hash.service";
import { KnowledgeEmbeddingService } from "@/services/admin/ai/rag/doc-chunk-processing/knowledge-embedding.service";
import { BatchProcessingService } from "@/services/admin/ai/rag/doc-chunk-processing/batch-processing.service";
import { KnowledgeIngestionWorker } from "@/workers/knowledge-ingestion.worker";
import { RetryService } from "@/services/admin/ai/rag/doc-chunk-processing/retry.service";
import { KnowledgeDocumentUploadService } from "@/services/admin/ai/rag/doc-chunk-processing/knowledge-document-upload.service";
import { KnowledgeDocumentManagementService } from "@/services/admin/knowledge-docs-management/knowledge-document.service";
import { KnowledgeIngestionQueue } from "@/queues/knowledge-ingestion.queue";
import { IKnowledgeIngestionQueue } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { KnowledgeDocumentController } from "@/controller/admin/knowledge-document.controller";
import { KnowledgeDocumentRoutes } from "@/routes/admin/knowledge-document.routes";

export function registerAIPlanning(container: Container): void {
  container.bind(TYPES.AIPlanningService).to(AIPlanningService);
  container.bind(TYPES.TripExtractionService).to(TripExtractionService);
  container.bind(TYPES.TripStateService).to(TripStateService);
  container.bind(TYPES.TripDateService).to(TripDateService);
  container.bind(TYPES.RoutePlanningService).to(RoutePlanningService);
  container.bind(TYPES.TravelModeMapper).to(TravelModeMapper);
  container.bind(TYPES.TripChangeDetectorService).to(TripChangeDetectorService);
  container.bind(TYPES.TripGraphService).to(TripGraphService);
  container.bind(TYPES.AIPlanningController).to(AIPlanningController);

  //RAG related
  container
    .bind(TYPES.DocumentTextExtractionService)
    .to(DocumentTextExtractionService)
    .inSingletonScope();
  container.bind(TYPES.DocumentChunkingService).to(DocumentChunkingService).inSingletonScope();
  container.bind(TYPES.DocumentEmbeddingService).to(DocumentEmbeddingService).inSingletonScope();
  container.bind(TYPES.KnowledgeEmbeddingService).to(KnowledgeEmbeddingService).inSingletonScope();
  container
    .bind(TYPES.KnowledgeDocumentRepository)
    .to(KnowledgeDocumentRepository)
    .inSingletonScope();
  container.bind(TYPES.KnowledgeChunkRepository).to(KnowledgeChunkRepository).inSingletonScope();
  container.bind(TYPES.KnowledgeIngestionService).to(KnowledgeIngestionService).inSingletonScope();
  container
    .bind(TYPES.KnowledgeVectorSearchService)
    .to(KnowledgeVectorSearchService)
    .inSingletonScope();
  container
    .bind(TYPES.ChunkMetadataExtractionService)
    .to(ChunkMetadataExtractionService)
    .inSingletonScope();
  container.bind(TYPES.DocumentHashService).to(DocumentHashService).inSingletonScope();
  container.bind(TYPES.BatchProcessingService).to(BatchProcessingService).inSingletonScope();
  container.bind(TYPES.RetryService).to(RetryService).inSingletonScope();
  container.bind(TYPES.KnowledgeIngestionWorker).to(KnowledgeIngestionWorker).inSingletonScope();
  container
    .bind(TYPES.KnowledgeDocumentUploadService)
    .to(KnowledgeDocumentUploadService)
    .inSingletonScope();

  //Knowledge document management related
  container
    .bind(TYPES.KnowledgeDocumentManagementService)
    .to(KnowledgeDocumentManagementService)
    .inSingletonScope();
  container
    .bind(TYPES.KnowledgeDocumentController)
    .to(KnowledgeDocumentController)
    .inSingletonScope();
  container.bind(TYPES.KnowledgeDocumentRoutes).to(KnowledgeDocumentRoutes).inSingletonScope();

  //Queue
  container
    .bind<IKnowledgeIngestionQueue>(TYPES.KnowledgeIngestionQueue)
    .to(KnowledgeIngestionQueue)
    .inSingletonScope();
}
