import IORedis from "ioredis";
import { env } from "./env";

//Creates a connection between our Node.js application and Redis.
// Redis is running locally through Docker on port 6379.
export const redisConnection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  console.log("Redis connected");
});

redisConnection.on("error", (error) => {
  console.log("Redis connection error:", error);
});
