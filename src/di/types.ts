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
} as const;
