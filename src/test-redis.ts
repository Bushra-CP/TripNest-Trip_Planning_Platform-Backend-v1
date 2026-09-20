import "reflect-metadata";

import { redisConnection } from "./config/redis";

/**
 * Tests basic communication between
 * Node.js and Redis.
 */
const testRedis = async (): Promise<void> => {
  // Send PING command to Redis
  const response = await redisConnection.ping();

  // Redis should respond with "PONG"
  console.log("Redis response:", response);

  // Store a test value
  await redisConnection.set("tripnest:test", "Redis is working");

  console.log("Test value stored successfully.");

  // Read the value from Redis
  const value = await redisConnection.get("tripnest:test");

  console.log("Value from Redis:", value);

  // Delete the test value
  await redisConnection.del("tripnest:test");

  console.log("Test value deleted.");

  // Close the connection
  await redisConnection.quit();
};

testRedis().catch((error: unknown) => {
  console.error("Redis test failed:", error);
});
