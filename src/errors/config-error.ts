import { AppError } from "./app-error.js";

export class ConfigError extends AppError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      details === undefined
        ? { code: "CONFIG_ERROR" }
        : {
            code: "CONFIG_ERROR",
            details,
          },
    );
  }
}
