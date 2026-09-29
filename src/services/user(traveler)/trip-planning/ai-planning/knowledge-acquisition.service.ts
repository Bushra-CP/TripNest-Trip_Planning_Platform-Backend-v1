import { injectable, inject } from "inversify";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { TYPES } from "@/di/types";
import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";
import { DocumentHashService } from "@/services/admin/ai/rag/doc-chunk-processing/document-hash.service";
import { IKnowledgeIngestionQueue } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { IKnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";

export interface KnowledgeAcquisitionInput {
  userMessage: string;
  destination: string | null;
  metadataField: string | null;
}

export interface AcquiredKnowledge {
  title: string;
  destination: string | null;
  category: string;
  content: string;
  documentId: string;
}

interface GeminiKnowledgeResponse {
  title: string;
  destination: string | null;
  category: string;
  content: string;
}

@injectable()
export class KnowledgeAcquisitionService {
  private readonly _ai: GoogleGenAI;
  private readonly _model: string;

  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.DocumentHashService)
    private readonly _documentHashService: DocumentHashService,

    @inject(TYPES.KnowledgeIngestionQueue)
    private readonly _knowledgeIngestionQueue: IKnowledgeIngestionQueue,
  ) {
    this._ai = new GoogleGenAI({
      apiKey: env.GOOGLE_API_KEY2,
    });

    this._model = env.GEMINI_MODEL;
  }

  public async acquireKnowledge(input: KnowledgeAcquisitionInput): Promise<AcquiredKnowledge> {
    const acquiredKnowledge = await this.generateKnowledge(input);

    const contentHash = this._documentHashService.generateHashFromText(acquiredKnowledge.content);

    const existingDocument = await this._knowledgeDocumentRepository.findOne({
      fileHash: contentHash,
    });

    if (existingDocument) {
      return this.handleExistingDocument(existingDocument);
    }

    const document = await this._knowledgeDocumentRepository.create({
      title: acquiredKnowledge.title,
      description: `Knowledge acquired from AI for the travel question: ${input.userMessage}`,
      destination: acquiredKnowledge.destination,
      category: acquiredKnowledge.category,
      fileType: "AI_ACQUIRED",
      fileKey: null,
      fileUrl: null,
      fileHash: contentHash,
      status: "PENDING",
      uploadedBy: "SYSTEM",
      sourceType: "AI_ACQUIRED",
      sourceId: null,
      sourceContent: acquiredKnowledge.content,
    });

    await this._knowledgeIngestionQueue.addJob({
      documentId: document._id.toString(),
    });

    return {
      ...acquiredKnowledge,
      documentId: document._id.toString(),
    };
  }

  private async generateKnowledge(
    input: KnowledgeAcquisitionInput,
  ): Promise<GeminiKnowledgeResponse> {
    const prompt = `
You are a travel knowledge acquisition system for TripNest.

The existing travel knowledge base does not have enough information
to answer the user's question.

Your task is to provide useful, factual travel knowledge that can be
stored in a knowledge base and reused for future users.

User question:
"${input.userMessage}"

Destination:
"${input.destination ?? "Not specified"}"

Knowledge category:
"${input.metadataField ?? "topics"}"

Rules:

- Answer the actual travel information requested by the user.
- Focus on useful factual information rather than conversational filler.
- Do not mention that you are an AI.
- Do not mention RAG, vector databases, knowledge bases, prompts, or internal systems.
- Do not invent specific facts when you are uncertain.
- Do not provide unsupported exact prices, opening hours, schedules, phone numbers,
  or other highly time-sensitive information unless you are confident.
- Keep the information focused on the requested destination and topic.
- The content must be suitable for storing and retrieving later.
- Return valid JSON only.

Return this exact structure:

{
  "title": "Short descriptive title",
  "destination": "Destination name or null",
  "category": "One knowledge category",
  "content": "Detailed factual travel knowledge"
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
            `Gemini knowledge acquisition failed with ${status}. Retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error("Gemini knowledge acquisition failed after retries");
    }

    let text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini returned empty knowledge");
    }

    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(text) as GeminiKnowledgeResponse;

      if (!parsed.title?.trim() || !parsed.content?.trim() || !parsed.category?.trim()) {
        throw new Error("Invalid knowledge response");
      }

      return {
        title: parsed.title.trim(),
        destination: parsed.destination?.trim() || input.destination,
        category: parsed.category.trim(),
        content: parsed.content.trim(),
      };
    } catch (error) {
      console.error("Failed to parse acquired travel knowledge:", error);

      throw new Error("Failed to parse acquired travel knowledge", {
        cause: error,
      });
    }
  }
  private handleExistingDocument(document: IKnowledgeDocument): AcquiredKnowledge {
    if (!document.sourceContent?.trim()) {
      throw new Error("Existing knowledge document has no source content");
    }

    return {
      title: document.title,
      destination: document.destination,
      category: document.category,
      content: document.sourceContent,
      documentId: document._id.toString(),
    };
  }
}
