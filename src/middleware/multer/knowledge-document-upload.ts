import { env } from "@/config/env";
import { KNOWLEDGE_DOCUMENT_MIME_TYPES } from "@/enums/media.enums";
import { createUploadMiddleware } from "./multer.factory";

export const uploadKnowledgeDocument = createUploadMiddleware({
  allowedMimeTypes: KNOWLEDGE_DOCUMENT_MIME_TYPES,
  maxFileSize: env.MAX_DOCUMENT_SIZE,
});
