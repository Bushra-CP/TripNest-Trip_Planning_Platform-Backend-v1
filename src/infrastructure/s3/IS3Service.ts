import { MediaFolder } from "@/enums/media.enums";

export interface UploadFileResult {
  key: string;

  url: string;
}

export interface IS3Service {
  uploadFile(file: Express.Multer.File, folder: MediaFolder): Promise<UploadFileResult>;

  downloadFile(key: string): Promise<Buffer>;

  deleteFile(key: string): Promise<void>;
}
