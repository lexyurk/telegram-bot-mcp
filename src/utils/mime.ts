import path from "node:path";

import mime from "mime-types";

import { AppError } from "../errors/app-error.js";
import type { TelegramMediaKind } from "../types/telegram.js";

export function detectMimeType(filePath: string): string | undefined {
  const detected = mime.lookup(filePath);

  if (detected === false) {
    return undefined;
  }

  return detected;
}

export function getFilenameFromPath(filePath: string): string {
  return path.basename(filePath);
}

export function getTelegramMediaKindForPath(
  filePath: string,
): TelegramMediaKind | "unknown" {
  const mimeType = detectMimeType(filePath);

  if (mimeType?.startsWith("image/")) {
    return "photo";
  }

  if (mimeType?.startsWith("video/")) {
    return "video";
  }

  if (mimeType) {
    return "document";
  }

  const extension = path.extname(filePath).toLowerCase();

  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(extension)) {
    return "photo";
  }

  if ([".mp4", ".mov", ".avi", ".webm", ".mkv"].includes(extension)) {
    return "video";
  }

  if (extension.length > 0) {
    return "document";
  }

  return "unknown";
}

export function assertMediaKindMatchesFile(
  filePath: string,
  expectedKind: Exclude<TelegramMediaKind, "document">,
): void {
  const inferredKind = getTelegramMediaKindForPath(filePath);

  if (inferredKind === expectedKind || inferredKind === "unknown") {
    return;
  }

  throw new AppError(
    `File does not match expected Telegram media kind "${expectedKind}".`,
    {
      code: "INVALID_MEDIA_KIND",
      details: {
        filePath,
        expectedKind,
        inferredKind,
      },
    },
  );
}
