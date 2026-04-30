import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";

import { AppError } from "../errors/app-error.js";

export async function assertReadableFile(filePath: string): Promise<void> {
  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      throw new AppError("Expected a file path, but received a non-file path.", {
        code: "INVALID_FILE_PATH",
        details: { filePath },
      });
    }

    await access(filePath, constants.R_OK);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("File path does not exist or is not readable.", {
      code: "INVALID_FILE_PATH",
      details: {
        filePath,
        cause:
          error instanceof Error
            ? error.message
            : "Unknown file system validation error",
      },
      cause: error,
    });
  }
}
