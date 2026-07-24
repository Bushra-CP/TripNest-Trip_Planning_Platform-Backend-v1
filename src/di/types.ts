export const TYPES = {
  /* ==============================
   * AUTH
   * ============================== */
  AuthRepository: Symbol.for("AuthRepository"),
  AuthService: Symbol.for("AuthService"),
  AuthController: Symbol.for("AuthController"),
  AuthRoutes: Symbol.for("AuthRoutes"),

  /* ==============================
   * REGISTER
   * ============================== */
  UserRepository: Symbol.for("UserRepository"),
  TravelerProfileRepository: Symbol.for("TravelerProfileRepository"),
  TravelerProfileService: Symbol.for("TravelerProfileService"),
  TravelerProfileController: Symbol.for("TravelerProfileController"),
  TravelerProfileRoutes: Symbol.for("TravelerProfileRoutes"),

  /* ==============================
   * OTP
   * ============================== */
  OtpRepository: Symbol.for("OtpRepository"),

  /* ==============================
   * SHARED SERVICES (INTEGRATIONS)
   * ============================== */
  JwtService: Symbol.for("JwtService"),
  MailService: Symbol.for("MailService"),
  OtpService: Symbol.for("OtpService"),
  PasswordService: Symbol.for("PasswordService"),
  GoogleService: Symbol.for("GoogleService"),

  /* ==============================
   * DATABASE
   * ============================== */
  DatabaseService: Symbol.for("DatabaseService"),
} as const;
