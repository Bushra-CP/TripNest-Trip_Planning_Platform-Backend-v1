import { env } from "@/config/env";
import { createUploadMiddleware } from "./multer.factory";
import { IMAGE_MIME_TYPES } from "@/enums/media.enums";

export const uploadProfileImage = createUploadMiddleware({
  allowedMimeTypes: IMAGE_MIME_TYPES,

  maxFileSize: env.MAX_IMAGE_SIZE,
});
