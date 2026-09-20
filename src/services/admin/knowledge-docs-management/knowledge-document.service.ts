import { TYPES } from "@/di/types";
import {
  GetKnowledgeDocumentsQueryDto,
  GetKnowledgeDocumentsResponseDto,
  KnowledgeDocumentResponseDto,
} from "@/dtos/admin/rag-knowledge-document/knowledge-document.dto";
import { IS3Service } from "@/infrastructure/s3/IS3Service";
import { KnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";
import { IKnowledgeDocumentRepository } from "@/interfaces/IRepository/admin/knowledge-docs-management/IKnowledgeDocumentRepository";
import { IKnowledgeChunkRepository } from "@/interfaces/IRepository/user(traveler)/trip-planning/knowledge-chunk-repo.interface";
import { IKnowledgeDocumentManagementService } from "@/interfaces/IServices/admin/IKnowledgeDocumentService";
import { KnowledgeDocumentMapper } from "@/mapper/knowledge-document.mapper";
import { inject, injectable } from "inversify";
import { Types } from "mongoose";

@injectable()
export class KnowledgeDocumentManagementService implements IKnowledgeDocumentManagementService {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 50;

  constructor(
    @inject(TYPES.KnowledgeDocumentRepository)
    private readonly _knowledgeDocumentRepository: IKnowledgeDocumentRepository,

    @inject(TYPES.KnowledgeChunkRepository)
    private readonly _knowledgeChunkRepository: IKnowledgeChunkRepository,

    @inject(TYPES.S3Service)
    private readonly _s3Service: IS3Service,
  ) {}

  public async getDocuments(
    query: GetKnowledgeDocumentsQueryDto,
  ): Promise<GetKnowledgeDocumentsResponseDto> {
    //Normalize page
    const page = !query.page || query.page < 1 ? this.DEFAULT_PAGE : Math.floor(query.page);

    //Normalize limit
    const limit =
      !query.limit || query.limit < 1
        ? this.DEFAULT_LIMIT
        : Math.min(Math.floor(query.limit), this.MAX_LIMIT);

    const search = query.search?.trim();

    const status = query.status;

    const [documents, totalItems] = await Promise.all([
      this._knowledgeDocumentRepository.findPaginatedWithChunkCount(page, limit, search, status),

      this._knowledgeDocumentRepository.countWithFilters(search, status),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      documents: documents.map((document) =>
        KnowledgeDocumentMapper.toResponse(document, document.chunkCount),
      ),

      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit,
      },
    };
  }

  public async getDocumentById(documentId: string): Promise<KnowledgeDocumentResponseDto> {
    /*
     * Validate and convert document ID.
     */
    if (!Types.ObjectId.isValid(documentId)) {
      throw new Error("Invalid knowledge document ID.");
    }

    const objectId = new Types.ObjectId(documentId);

    const document = await this._knowledgeDocumentRepository.findById(objectId.toString());

    if (!document) {
      throw new Error("Knowledge document not found.");
    }

    const chunkCount = await this._knowledgeChunkRepository.count({
      documentId: objectId,
    });

    return KnowledgeDocumentMapper.toResponse(document, chunkCount);
  }

  public async deleteDocument(documentId: string): Promise<void> {
    //Validate and convert document ID
    if (!Types.ObjectId.isValid(documentId)) {
      throw new Error("Invalid knowledge document ID.");
    }

    const objectId = new Types.ObjectId(documentId);

    const document = await this._knowledgeDocumentRepository.findById(objectId.toString());

    if (!document) {
      throw new Error("Knowledge document not found.");
    }

    //Delete original file from S3.
    await this._s3Service.deleteFile(document.fileKey);

    //Delete all knowledge chunks.
    await this._knowledgeChunkRepository.deleteByDocumentId(objectId);

    //Delete the knowledge document.
    await this._knowledgeDocumentRepository.deleteById(objectId.toString());
  }

  private toResponseDto(
    document: KnowledgeDocument,
    chunkCount?: number,
  ): KnowledgeDocumentResponseDto {
    return {
      id: document._id.toString(),
      title: document.title,
      description: document.description,
      destination: document.destination,
      category: document.category,
      fileType: document.fileType,
      fileUrl: document.fileUrl,
      status: document.status,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.createdAt.toISOString(),
      chunkCount: chunkCount ?? 0,
    };
  }
}
