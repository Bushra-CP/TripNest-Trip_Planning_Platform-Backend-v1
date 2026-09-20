import { injectable } from "inversify";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import type { KnowledgeDocumentFileType } from "@/interfaces/IModel/knowledge-document.interfaces";

/**
 *
 * 2
 *
 * To take a document file and return its plain text.
 *
 * @export
 * @class DocumentTextExtractionService
 */
@injectable()
export class DocumentTextExtractionService {
  public async extractText(
    fileBuffer: Buffer,
    fileType: KnowledgeDocumentFileType,
  ): Promise<string> {
    switch (fileType) {
      case "PDF":
        return this.extractPdfText(fileBuffer);

      case "DOCX":
        return this.extractDocxText(fileBuffer);

      case "TXT":
        return this.extractTxtText(fileBuffer);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async extractPdfText(fileBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({
      data: fileBuffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    return result.text.trim();
  }

  private async extractDocxText(fileBuffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({
      buffer: fileBuffer,
    });

    return result.value.trim();
  }

  private async extractTxtText(fileBuffer: Buffer): Promise<string> {
    return fileBuffer.toString("utf-8").trim();
  }
}
