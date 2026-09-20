import type {
  KnowledgeDocumentFileType,
  KnowledgeDocumentStatus,
} from "@/interfaces/IModel/knowledge-document.interfaces";

// Query parameters used when fetching knowledge documents
export interface GetKnowledgeDocumentsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: KnowledgeDocumentStatus;
}

//Data required when uploading a new knowledge document.
export interface UploadKnowledgeDocumentDto {
  title: string;
  description?: string | null;
  destination?: string | null;
  category: string;
  file: Express.Multer.File;
}

//Data returned for a single knowledge document.
export interface KnowledgeDocumentResponseDto {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  category: string;
  fileType: KnowledgeDocumentFileType;
  fileUrl: string;
  status: KnowledgeDocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  chunkCount: number;
}

//Pagination informations
export interface KnowledgeDocumentPaginationDto {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

// Response returned by the GET /knowledge-documents API.
export interface GetKnowledgeDocumentsResponseDto {
  documents: KnowledgeDocumentResponseDto[];
  pagination: KnowledgeDocumentPaginationDto;
}
