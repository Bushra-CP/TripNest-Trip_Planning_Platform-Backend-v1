import { MediaFolder } from "@/enums/media.enums";

export interface UploadFileResult {
  key: string;

  url: string;
}

export interface IS3Service {
  uploadFile(file: Express.Multer.File, folder: MediaFolder): Promise<UploadFileResult>;

  deleteFile(key: string): Promise<void>;
}
