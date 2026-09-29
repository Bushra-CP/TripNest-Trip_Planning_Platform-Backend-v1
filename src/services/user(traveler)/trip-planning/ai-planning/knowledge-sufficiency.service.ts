import { injectable } from "inversify";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import type { KnowledgeChunkSearchResult } from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";

interface KnowledgeSufficiencyResult {
  sufficient: boolean;
}

@injectable()
export class KnowledgeSufficiencyService {
  private readonly _ai: GoogleGenAI;
  private readonly _model: string;

  constructor() {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY2,
    });

    this._model = env.GEMINI_MODEL;
  }

  public async isSufficient(
    userMessage: string,
    ragContext: KnowledgeChunkSearchResult[],
  ): Promise<boolean> {
    if (ragContext.length === 0) {
      return false;
    }

    const context = ragContext
      .map((result, index) => `SOURCE ${index + 1}:\n${result.content}`)
      .join("\n\n");

    const prompt = `
You are evaluating whether retrieved travel knowledge is sufficient
to answer a user's question.

User question:
"${userMessage}"

Retrieved knowledge:

${context}

Determine whether the retrieved knowledge contains enough relevant
information to answer the user's question accurately.

Rules:

- Return true only if the retrieved knowledge directly contains
  enough information to answer the question.
- Return false if the information is unrelated.
- Return false if important information required to answer the
  question is missing.
- Do not use your own world knowledge.
- Evaluate ONLY the retrieved knowledge.
- Return ONLY valid JSON.

Return:

{
  "sufficient": true
}

or:

{
  "sufficient": false
}
`;

    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await this._ai.models.generateContent({
          model: this._model,
          contents: prompt,
        });

        break;
      } catch (error) {
        const status = (error as { status?: number }).status;

        if ((status === 503 || status === 429) && attempt < 3) {
          const delay = attempt * 2000;

          console.log(
            `Gemini knowledge sufficiency check failed with ${status}. Retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error("Gemini knowledge sufficiency check failed after retries");
    }

    let text = response.text?.trim();

    if (!text) {
      return false;
    }

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(text) as KnowledgeSufficiencyResult;

      return parsed.sufficient === true;
    } catch (error) {
      console.error("Failed to parse knowledge sufficiency result:", error);

      return false;
    }
  }
}
