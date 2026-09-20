import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { injectable } from "inversify";

/**
 *
 * 3
 *
 * To take the extracted text and split it into
 * smaller meaningful pieces before generating embeddings.
 *
 * @export
 * @class DocumentChunkingService
 */
@injectable()
export class DocumentChunkingService {
  private readonly textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
  }

  public async createChunks(text: string): Promise<string[]> {
    if (!text.trim()) {
      throw new Error("Cannot create chunks from empty text");
    }

    return this.textSplitter.splitText(text);
  }
}
