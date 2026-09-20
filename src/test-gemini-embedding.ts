import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { env } from "./config/env";

const testGeminiEmbedding = async (): Promise<void> => {
  console.log("Starting Gemini embedding test...");

  const apiKey = env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is missing from .env");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  console.log("Sending text to Gemini...");

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: "Kerala is a beautiful travel destination in India.",
    config: {
      outputDimensionality: 768,
    },
  });

  console.log("Gemini embedding generated successfully.");

  console.log("Embedding length:", response.embeddings?.[0]?.values?.length);

  console.log("First 5 values:", response.embeddings?.[0]?.values?.slice(0, 5));
};

testGeminiEmbedding().catch((error: unknown) => {
  console.error("Gemini embedding test failed:", error);
});
