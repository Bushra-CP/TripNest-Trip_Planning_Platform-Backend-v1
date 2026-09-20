import { KnowledgeDocument } from "@/interfaces/IModel/knowledge-document.interfaces";

import { KnowledgeDocumentResponseDto } from "@/dtos/admin/rag-knowledge-document/knowledge-document.dto";

export class KnowledgeDocumentMapper {
  static toResponse(document: KnowledgeDocument, chunkCount: number): KnowledgeDocumentResponseDto {
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
