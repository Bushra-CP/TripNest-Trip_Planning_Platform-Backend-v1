import multer from "multer";

interface UploadOptions {
  allowedMimeTypes: readonly string[];
  maxFileSize: number;
}

export const createUploadMiddleware = (options: UploadOptions) => {
  return multer({
    storage: multer.memoryStorage(),

    limits: {
      fileSize: options.maxFileSize,
    },

    fileFilter(req, file, cb) {
      if (options.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type"));
      }
    },
  });
};
