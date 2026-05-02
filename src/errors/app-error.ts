export interface AppErrorOptions {
  code?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;

  readonly details?: Record<string, unknown>;

  public constructor(message: string, options?: AppErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);

    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";

    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}
