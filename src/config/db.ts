import mongoose from "mongoose";
import { env } from './env.js';


export const connectDB = async () => {
  const mongoUri = env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB Connected");
};