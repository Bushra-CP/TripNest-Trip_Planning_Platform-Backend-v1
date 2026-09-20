import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { injectable } from "inversify";

/**
 * 1
 *
 * Creates a unique hash from the file content.
 * The hash is used to detect duplicate documents.
 *
 * @export
 * @class DocumentHashService
 */
@injectable()
export class DocumentHashService {
  public async generateFileHash(filePath: string): Promise<string> {
    //read the complete file
    const fileBuffer = await readFile(filePath);

    return this.generateHashFromBuffer(fileBuffer);
  }
  //generate SHA-256 hash from the file content
  public generateHashFromBuffer(fileBuffer: Buffer): string {
    return createHash("sha256").update(fileBuffer).digest("hex");
  }
}
