import { injectable } from "inversify";

@injectable()
export class RetryService {
  /**
   * Executes an asynchronous operation and retries it when it fails.
   *
   * @template T
   * @param {() => Promise<T>} operation
   * @param {number} [maxAttempts=3]
   * @param {number} [initialDelayMs=2_000]
   * @return {*}  {Promise<T>}
   * @memberof RetryService
   */
  public async execute<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    initialDelayMs = 2_000,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Do not retry errors that are unlikely to succeed by simply trying again.
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // No attempts remaining
        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff: 2s → 4s → 8s
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);

        console.warn(
          `Retryable error occurred. ` +
            `Retrying in ${delayMs / 1000}s ` +
            `(attempt ${attempt + 1}/${maxAttempts})...`,
        );

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  /*
    Determines whether an error is likely temporary.
   
    We retry:
    - HTTP 429: rate limit
    - HTTP 500/502/503/504: temporary server errors
    - Network/connection errors
   */
  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const errorObject = error as {
      status?: number;
      statusCode?: number;
      code?: string;
      message?: string;
    };

    const status = errorObject.status ?? errorObject.statusCode;

    // Rate limiting
    if (status === 429) {
      return true;
    }

    // Temporary server errors
    if (status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    // Common network errors
    const networkErrorCodes = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"];

    if (errorObject.code && networkErrorCodes.includes(errorObject.code)) {
      return true;
    }

    // Some SDK/network errors expose useful information only through their message.
    const message = errorObject.message?.toLowerCase() ?? "";

    return (
      message.includes("timeout") ||
      message.includes("socket") ||
      message.includes("connection reset") ||
      message.includes("temporarily unavailable")
    );
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
