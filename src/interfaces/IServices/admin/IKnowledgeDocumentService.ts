import {
  GetKnowledgeDocumentsQueryDto,
  GetKnowledgeDocumentsResponseDto,
  KnowledgeDocumentResponseDto,
} from "@/dtos/admin/rag-knowledge-document/knowledge-document.dto";

export interface IKnowledgeDocumentManagementService {
  getDocuments(query: GetKnowledgeDocumentsQueryDto): Promise<GetKnowledgeDocumentsResponseDto>;

  getDocumentById(documentId: string): Promise<KnowledgeDocumentResponseDto>;

  deleteDocument(documentId: string): Promise<void>;
}
