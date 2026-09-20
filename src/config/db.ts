import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async (): Promise<void> => {
  const mongoUri = env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(mongoUri, {
    dbName: "TripNest",
  });

  console.log("MongoDB Connected");
};
