import { injectable } from "inversify";

/**
 *
 * 4
 *
 * This service splits an array into smaller batches.
 *
 * @export
 * @class BatchProcessingService
 */
@injectable()
export class BatchProcessingService {
  public createBatches<T>(items: T[], batchSize: number): T[][] {
    if (batchSize <= 0) {
      throw new Error("Batch size must be greater than 0");
    }

    const batches: T[][] = [];

    // Split the items into smaller batches
    for (let index = 0; index < items.length; index += batchSize) {
      batches.push(items.slice(index, index + batchSize));
    }

    return batches;
  }
}
