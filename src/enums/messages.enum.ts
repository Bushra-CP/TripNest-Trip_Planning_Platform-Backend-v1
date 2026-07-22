export enum Messages {
  ACCOUNT_DEACTIVATED = "Your account has been deactivated.",
  REFRESH_TOKEN_MISSING = "Refresh token missing",
  TOKEN_EXPIRED = "Token expired. Please login again.",
}

export enum SuccessMessages {
  REGISTER_REQUEST_RESPONSE = "OTP sent successfully. Please verify your email.",
  REGISTRATION_COMPLETED_SUCCESSFULLY = "Registration completed successfully.",
  OTP_RESENT = "A new OTP has been sent to your registered email address.",
}

export enum ErrorMessages {
  INTERNAL_SERVER_ERROR = "Internal Server Error",
  EMAIL_CONFLICT_MESSSAGE = "An account with this email already exists.",
  USER_NOT_FOUND = "User not found.",
  USER_ALREADY_VERIFIED = "User is already verified.",
  PROFILE_NOT_FOUND = "Traveler profile not found.",
  OTP_EXPIRED = "OTP has expired. Please request a new one.",
  INVALID_OTP = "Invalid OTP.",
  USER_CANNOT_VERIFIED = "Unable to verify user.",
  INVALID_EMAIL = "Invalid email or password",
  VERIFY_EMAIL = "Please verify your email before logging in.",
  INVALID_TOKEN = "Invalid token",
}

export enum ValidationMessages {
  VALIDATION_FAILDED = "Validation failed",
  EMAIL_REQUIRED = "Email is required",
  ENTER_VALID_EMAIL = "Please enter a valid email address",
  PASSWORD_REQUIRED = "Password is required",
  PASSWORD_CONSTRAINT_ERROR1 = "Password must be at least 8 characters",
  PASSWORD_CONSTRAINT_ERROR2 = "Password cannot exceed 50 characters",
  PASSWORD_CONSTRAINT_ERROR3 = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  FULL_NAME_ERROR1 = "Full name should be atleast 4 characters",
  FULL_NAME_ERROR2 = "Full name is too long",
  ENTER_VALID_PHONE = "Please enter a valid Indian mobile number",
  USERID_REQUIRED = "User ID is required",
  OTP_CONSTRAINT = "OTP must be exactly 6 digits",
}
