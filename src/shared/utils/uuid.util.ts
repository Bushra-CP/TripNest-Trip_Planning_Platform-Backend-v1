import { injectable } from "inversify";

@injectable()
export class UUIDUtil {
  public generate(): string {
    return crypto.randomUUID();
  }
}
