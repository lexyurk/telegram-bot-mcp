import type { HeaderConfig } from "../types/config.js";

const BOT_TOKEN_HEADERS = ["x-telegram-bot-token", "telegram-bot-token"] as const;
const DEFAULT_CHAT_ID_HEADERS = [
  "x-telegram-default-chat-id",
  "telegram-chat-id",
] as const;

function normalizeHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value[0]?.trim();
    return firstValue && firstValue.length > 0 ? firstValue : undefined;
  }

  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  candidates: readonly string[],
): string | undefined {
  for (const candidate of candidates) {
    const value = normalizeHeaderValue(headers[candidate]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function parseHeaderConfig(
  headers?: Record<string, string | string[] | undefined>,
): HeaderConfig {
  if (headers === undefined) {
    return {};
  }

  const botToken = getHeaderValue(headers, BOT_TOKEN_HEADERS);
  const defaultChatId = getHeaderValue(headers, DEFAULT_CHAT_ID_HEADERS);

  return {
    ...(botToken === undefined ? {} : { botToken }),
    ...(defaultChatId === undefined ? {} : { defaultChatId }),
  };
}
