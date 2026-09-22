export const TYPES = {
  /* ==============================
   * SHARED SERVICES (INTEGRATIONS)
   * ============================== */
  JwtService: Symbol.for("JwtService"),
  MailService: Symbol.for("MailService"),
  OtpService: Symbol.for("OtpService"),
  PasswordService: Symbol.for("PasswordService"),
  GoogleService: Symbol.for("GoogleService"),
  S3Service: Symbol.for("S3Service"),
  UUIDUtil: Symbol.for("UUIDUtil"),

  /* ==============================
   * OTP
   * ============================== */
  OtpRepository: Symbol.for("OtpRepository"),

  /* ==============================
   * DATABASE
   * ============================== */
  DatabaseService: Symbol.for("DatabaseService"),

  /* ==============================
   * LOGGER
   * ============================== */
  Logger: Symbol.for("Logger"),

  /* ==============================
   * MIDDLEWARE
   * ============================== */

  ErrorMiddleware: Symbol.for("ErrorMiddleware"),
  AuthenticateMiddleware: Symbol.for("AuthenticateMiddleware"),
  AuthorizeMiddleware: Symbol.for("AuthorizeMiddleware"),

  /* ==============================
   * AUTH
   * ============================== */
  AuthRepository: Symbol.for("AuthRepository"),
  AuthService: Symbol.for("AuthService"),
  AuthController: Symbol.for("AuthController"),
  AuthRoutes: Symbol.for("AuthRoutes"),

  /* ==============================
   * TRAVELER PROFILE/REGISTER
   * ============================== */
  UserRepository: Symbol.for("UserRepository"),
  TravelerProfileRepository: Symbol.for("TravelerProfileRepository"),
  TravelerProfileService: Symbol.for("TravelerProfileService"),
  TravelerProfileController: Symbol.for("TravelerProfileController"),
  TravelerProfileRoutes: Symbol.for("TravelerProfileRoutes"),

  /* ==============================
   * ADMIN/USER MANAGEMENT
   * ============================== */
  UserManagementRepository: Symbol.for("UserManagementRepository"),
  UserManagementService: Symbol.for("UserManagementService"),
  UserManagementController: Symbol.for("UserManagementController"),
  UserManagementRoutes: Symbol.for("UserManagementRoutes"),

  /* ==============================
   * TRIP PLANNING
   * ============================== */
  RoomRepository: Symbol.for("RoomRepository"),
  RoomService: Symbol.for("RoomService"),
  RoomController: Symbol.for("RoomController"),
  MessageRepository: Symbol.for("MessageRepository"),
  MessageService: Symbol.for("MessageService"),
  MessageController: Symbol.for("MessageController"),
  TripPlanningRoutes: Symbol.for("TripPlanningRoutes"),
  TripRequirementsRepository: Symbol.for("TripRequirementsRepository"),
  TripRouteRepository: Symbol.for("TripRouteRepository"),
  TripRepository: Symbol.for("TripRepository"),
  TripService: Symbol.for("TripService"),
  TripRequirementsService: Symbol.for("TripRequirementsService"),
  TripRouteService: Symbol.for("TripRouteService"),

  /* ==============================
   * SOCKET
   * ============================== */
  ChatSocket: Symbol.for("ChatSocket"),

  /* ==============================
   * AI PLANNING
   * ============================== */
  AIPlanningService: Symbol.for("AIPlanningService"),
  TripExtractionService: Symbol.for("TripExtractionService"),
  TripStateService: Symbol.for("TripStateService"),
  TripDateService: Symbol.for("TripDateService"),
  RoutePlanningService: Symbol.for("RoutePlanningService"),
  TravelModeMapper: Symbol.for("TravelModeMapper"),
  TripChangeDetectorService: Symbol.for("TripChangeDetectorService"),
  TripGraphService: Symbol.for("TripGraphService"),
  RouteRequestService: Symbol.for("RouteRequestService"),
  AIPlanningController: Symbol.for("AIPlanningController"),

  /* ==============================
   * RAG
   * ============================== */
  DocumentTextExtractionService: Symbol.for("DocumentTextExtractionService"),
  DocumentChunkingService: Symbol.for("DocumentChunkingService"),
  DocumentEmbeddingService: Symbol.for("DocumentEmbeddingService"),
  KnowledgeEmbeddingService: Symbol.for("KnowledgeEmbeddingService"),
  KnowledgeDocumentRepository: Symbol.for("KnowledgeDocumentRepository"),
  KnowledgeChunkRepository: Symbol.for("KnowledgeChunkRepository"),
  KnowledgeIngestionService: Symbol.for("KnowledgeIngestionService"),
  KnowledgeVectorSearchService: Symbol.for("KnowledgeVectorSearchService"),
  ChunkMetadataExtractionService: Symbol.for("ChunkMetadataExtractionService"),
  DocumentHashService: Symbol.for("DocumentHashService"),
  BatchProcessingService: Symbol.for("BatchProcessingService"),
  RetryService: Symbol.for("RetryService"),
  KnowledgeIngestionWorker: Symbol.for("KnowledgeIngestionWorker"),
  KnowledgeDocumentUploadService: Symbol.for("KnowledgeDocumentUploadService"),
  KnowledgeDocumentManagementService: Symbol.for("KnowledgeDocumentManagementService"),
  KnowledgeIngestionQueue: Symbol.for("KnowledgeIngestionQueue"),
  KnowledgeDocumentController: Symbol.for("KnowledgeDocumentController"),
  KnowledgeDocumentRoutes: Symbol.for("KnowledgeDocumentRoutes"),
} as const;
