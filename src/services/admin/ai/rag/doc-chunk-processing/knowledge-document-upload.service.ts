import { TYPES } from "@/di/types";
import type {
  KnowledgeDocument,
  KnowledgeDocumentFileType,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import { MediaFolder } from "@/enums/media.enums";
import { inject, injectable } from "inversify";
import { IS3Service } from "@/infrastructure/s3/IS3Service";
import { KnowledgeDocumentRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-document.repository";
import { DocumentHashService } from "./document-hash.service";
import { IKnowledgeIngestionQueue } from "@/interfaces/IQueue/knowledge-ingestion-job.interfaces";
import { KnowledgeChunkRepository } from "@/repositories/admin/knowledge-docs-management/knowledge-chunk.repository";
import { AppError } from "@/shared/errors/app.error";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { ErrorMessages } from "@/enums/messages.enum";

export interface KnowledgeDocumentUploadInput {
  file: Express.Multer.File;
  title: string;
  description: string | null;
  destination: string | null;
  category: string;
  fileType: KnowledgeDocumentFileType;
  uploadedBy: string;
}

@injectable()
export class KnowledgeDocumentUploadService {
  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: KnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: KnowledgeChunkRepository,

    @inject(TYPES.DocumentHashService)
    private readonly _documentHashService: DocumentHashService,

    @inject(TYPES.S3Service)
    private readonly _s3Service: IS3Service,

    @inject(TYPES.KnowledgeIngestionQueue)
    private readonly _knowledgeIngestionQueue: IKnowledgeIngestionQueue,
  ) {}

  public async uploadDocument(input: KnowledgeDocumentUploadInput): Promise<KnowledgeDocument> {
    // Generate hash from the uploaded file
    const fileHash = this._documentHashService.generateHashFromBuffer(input.file.buffer);

    // Check whether the file is already uploaded
    const existingDocument = await this._knowledgeDocumentRepository.findOne({ fileHash });

    //f the same file already exists, check the previous document's status.
    if (existingDocument) {
      // The document was successfully processed before.
      if (existingDocument.status === "READY") {
        throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.DOCUMENT_ALREADY_EXISTS);
      }

      // The document is already waiting for or undergoing processing.
      if (existingDocument.status === "PENDING" || existingDocument.status === "PROCESSING") {
        throw new AppError(STATUS_CODES.CONFLICT, ErrorMessages.DOCUMENT_PROCESSING);
      }

      //The previous ingestion failed.
      if (existingDocument.status === "FAILED") {
        await this._knowledgeChunkRepository.deleteByDocumentId(existingDocument._id);

        // Reset the document so it can be processed again.
        const updatedDocument = await this._knowledgeDocumentRepository.updateById(
          existingDocument._id.toString(),
          {
            status: "PENDING",
          },
        );

        if (!updatedDocument) {
          throw new AppError(
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            ErrorMessages.DOCUMENT_RESET_FAILED,
          );
        }

        // Add the document back to the ingestion queue.
        await this._knowledgeIngestionQueue.addJob({
          documentId: existingDocument._id.toString(),
        });

        return updatedDocument;
      }
    }

    // Upload the original file to S3
    const uploadResult = await this._s3Service.uploadFile(
      input.file,
      MediaFolder.KNOWLEDGE_DOCUMENTS,
    );

    let document: KnowledgeDocument | null = null;

    try {
      document = await this._knowledgeDocumentRepository.create({
        title: input.title,
        description: input.description ?? null,
        destination: input.destination ?? null,
        category: input.category,
        fileType: input.fileType,
        fileKey: uploadResult.key,
        fileUrl: uploadResult.url,
        fileHash,
        status: "PENDING",
        uploadedBy: input.uploadedBy,
      });

      await this._knowledgeIngestionQueue.addJob({
        documentId: document._id.toString(),
      });

      return document;
    } catch (error) {
      if (document) {
        await this._knowledgeDocumentRepository.deleteById(document._id.toString());
      }

      await this._s3Service.deleteFile(uploadResult.key);

      throw error;
    }
  }
}
