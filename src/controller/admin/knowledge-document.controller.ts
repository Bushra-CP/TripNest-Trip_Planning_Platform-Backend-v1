import { TYPES } from "@/di/types";
import { GetKnowledgeDocumentsQueryDto } from "@/dtos/admin/rag-knowledge-document/knowledge-document.dto";
import { inject, injectable } from "inversify";
import { NextFunction, Request, Response } from "express";
import { IKnowledgeDocumentManagementService } from "@/interfaces/IServices/admin/IKnowledgeDocumentService";
import { ResponseHandler } from "@/shared/http/responseHandler";
import { STATUS_CODES } from "@/enums/status.codes.enum";
import { SuccessMessages } from "@/enums/messages.enum";
import {
  KnowledgeDocumentFileType,
  KnowledgeDocumentStatus,
} from "@/interfaces/IModel/knowledge-document.interfaces";
import { KnowledgeDocumentUploadService } from "@/services/admin/ai/rag/doc-chunk-processing/knowledge-document-upload.service";

@injectable()
export class KnowledgeDocumentController {
  constructor(
    @inject(TYPES.KnowledgeDocumentManagementService)
    private readonly _knowledgeDocumentService: IKnowledgeDocumentManagementService,

    @inject(TYPES.KnowledgeDocumentUploadService)
    private readonly _knowledgeDocumentUploadService: KnowledgeDocumentUploadService,
  ) {}

  public async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new Error("Knowledge document file is required.");
      }

      const { title, description, destination, category } = req.body;

      const data = await this._knowledgeDocumentUploadService.uploadDocument({
        file: req.file,
        title,
        description: description ?? null,
        destination: destination ?? null,
        category,
        fileType: this.getFileType(req.file.mimetype),
        uploadedBy: req.user.userId,
      });

      ResponseHandler.success(
        res,
        STATUS_CODES.CREATED,
        SuccessMessages.KNOWLEDGE_DOCUMENT_UPLOADED,
        data,
      );
    } catch (error) {
      next(error);
    }
  }

  public async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: GetKnowledgeDocumentsQueryDto = {};

      if (req.query.page) {
        query.page = Number(req.query.page);
      }

      if (req.query.limit) {
        query.limit = Number(req.query.limit);
      }

      if (req.query.search) {
        query.search = req.query.search as string;
      }

      if (req.query.status) {
        query.status = req.query.status as KnowledgeDocumentStatus;
      }

      const data = await this._knowledgeDocumentService.getDocuments(query);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.KNOWLEDGE_DOCUMENTS_FETCHED,
        data,
      );
    } catch (error) {
      next(error);
    }
  }

  public async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        throw new Error("Knowledge document ID is required.");
      }

      const data = await this._knowledgeDocumentService.getDocumentById(id);

      ResponseHandler.success(
        res,
        STATUS_CODES.OK,
        SuccessMessages.KNOWLEDGE_DOCUMENT_FETCHED,
        data,
      );
    } catch (error) {
      next(error);
    }
  }

  public async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        throw new Error("Knowledge document ID is required.");
      }

      await this._knowledgeDocumentService.deleteDocument(id);

      ResponseHandler.success(res, STATUS_CODES.OK, SuccessMessages.KNOWLEDGE_DOCUMENT_DELETED);
    } catch (error) {
      next(error);
    }
  }

  private getFileType(mimeType: string): KnowledgeDocumentFileType {
    switch (mimeType) {
      case "application/pdf":
        return "PDF";

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "DOCX";

      case "text/plain":
        return "TXT";

      default:
        throw new Error("Unsupported knowledge document file type.");
    }
  }
}
