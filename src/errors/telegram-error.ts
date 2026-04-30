import { AppError } from "./app-error.js";

export class TelegramError extends AppError {
  public constructor(
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message, {
      code: "TELEGRAM_ERROR",
      ...(options?.details ? { details: options.details } : {}),
      ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    });
  }
}
