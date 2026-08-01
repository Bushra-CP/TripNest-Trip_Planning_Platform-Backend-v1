import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  MONGO_URI: process.env.MONGO_URI,
  JWT_ACCESS_SECRET: "JWT_ACCESS_SECRET",
  JWT_REFRESH_SECRET: "JWT_REFRESH_SECRET",
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? "15m",
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? "7d",
  BCRYPT_SALT: Number(process.env.BCRYPT_SALT ?? 10),
  CLIENT_URL: process.env.CLIENT_URL,
  MAIL_USERNAME: process.env.MAIL_USERNAME,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION,
  MAX_IMAGE_SIZE: Number(process.env.MAX_IMAGE_SIZE),
  MAX_VIDEO_SIZE: Number(process.env.MAX_VIDEO_SIZE),
};

// `.env` vs `config/env.ts`

// `.env`:
// Stores environment variables (API keys, database URL, secrets, ports). It is the source of configuration values.

// `config/env.ts`:
// Acts as a centralized access point for environment variables.
// Reads values from process.env once and exports them for the rest of the application.
// Can validate required variables, convert data types (e.g., string → number), and provide TypeScript type safety.
// Prevents repeated use of process.env throughout the codebase.

// Flow:

// .env → process.env → config/env.ts → Application

// Best Practice: Store values in `.env` and access them through `config/env.ts` instead of using `process.env` throughout the project.
