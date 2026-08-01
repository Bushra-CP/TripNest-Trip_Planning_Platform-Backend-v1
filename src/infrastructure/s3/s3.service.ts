import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { Upload } from "@aws-sdk/lib-storage";

import { randomUUID } from "crypto";
import { IS3Service, UploadFileResult } from "./IS3Service";
import { s3Client } from "@/config/s3";
import { env } from "@/config/env";
import { injectable } from "inversify";

@injectable()
export class S3Service implements IS3Service {
  //to upload a media file to s3
  async uploadFile(
    file: Express.Multer.File,

    folder: string,
  ): Promise<UploadFileResult> {
    const extension = file.originalname.split(".").pop();

    const key = `${folder}/${randomUUID()}.${extension}`;

    const upload = new Upload({
      client: s3Client,

      params: {
        Bucket: env.AWS_BUCKET_NAME,

        Key: key,

        Body: file.buffer,

        ContentType: file.mimetype,
      },
    });

    await upload.done();

    return {
      key,

      url: `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    };
  }

  //to delete a media file from s3
  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.AWS_BUCKET_NAME,

        Key: key,
      }),
    );
  }
}
