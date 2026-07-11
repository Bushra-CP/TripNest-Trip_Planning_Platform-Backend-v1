export const TYPES = {
  /* ==============================
   * AUTH
   * ============================== */
  //   AuthRepository: Symbol.for("AuthRepository"),
  //   AuthService: Symbol.for("AuthService"),
  //   AuthController: Symbol.for("AuthController"),
  //   AuthRoutes: Symbol.for("AuthRoutes"),

  /* ==============================
   * REGISTER
   * ============================== */
  UserRegisterRepository: Symbol.for("UserRegisterRepository"),
  UserRegisterService: Symbol.for("UserRegisterService"),
  UserRegisterController: Symbol.for("UserRegisterController"),
  UserRegisterRoutes: Symbol.for("UserRegisterRoutes"),

  /* ==============================
   * SHARED SERVICES (INTEGRATIONS)
   * ============================== */
  JwtService: Symbol.for("JwtService"),
  MailService: Symbol.for("MailService"),
  OtpService: Symbol.for("OtpService"),
  PasswordService: Symbol.for("PasswordService"),

  /* ==============================
   * DATABASE
   * ============================== */
  Database: Symbol.for("Database"),
} as const;
