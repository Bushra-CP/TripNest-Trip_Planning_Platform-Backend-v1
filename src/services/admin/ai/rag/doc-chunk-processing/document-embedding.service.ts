import { env } from "@/config/env";
import { GoogleGenAI } from "@google/genai";
import { injectable } from "inversify";

/**
 * Converts text into numerical vectors (embeddings) using Google's Gemini Embedding API.
 * The generated embeddings are used for semantic search and RAG retrieval.
 *
 * @export
 * @class DocumentEmbeddingService
 */
@injectable()
export class DocumentEmbeddingService {
  private readonly ai: GoogleGenAI;

  private readonly model = "gemini-embedding-001";

  private readonly outputDimensionality = 768;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY,
    });
  }

  /**
   * Generates an embedding for a document chunk.
   * Generates embeddings for multiple document chunks in one Gemini request.

   * @param {string[]} texts
   * @return {*}  {Promise<number[][]>}
   * @memberof DocumentEmbeddingService
   */
  public async generateDocumentEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      throw new Error("Cannot generate embeddings for empty texts");
    }

    for (const text of texts) {
      if (!text.trim()) {
        throw new Error("Cannot generate embedding for empty text");
      }
    }

    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: texts,
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: this.outputDimensionality,
      },
    });

    const embeddings = response.embeddings?.map((embedding) => embedding.values);

    if (!embeddings || embeddings.length !== texts.length) {
      throw new Error(
        `Gemini returned ${embeddings?.length ?? 0} embeddings for ${texts.length} texts`,
      );
    }

    if (embeddings.some((embedding) => !embedding)) {
      throw new Error("Gemini returned an invalid document embedding");
    }

    return embeddings as number[][];
  }

  /**
   * Generates an embedding for a user's search/query text.
   *
   * @param {string} text
   * @return {*}  {Promise<number[]>}
   * @memberof DocumentEmbeddingService
   */
  public async generateQueryEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error("Cannot generate embedding for empty query");
    }

    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: this.outputDimensionality,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) {
      throw new Error("Gemini did not return a query embedding");
    }

    return embedding;
  }
}
