import type {
  HeaderConfig,
  RequestConfigInput,
  ResolvedRequestConfig,
} from "../types/config.js";
import { ConfigError } from "../errors/config-error.js";

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

function resolveBotToken(
  runtimeBotToken: string | undefined,
  headerConfig: HeaderConfig,
): string {
  const botToken =
    normalizeOptionalString(headerConfig.botToken) ??
    normalizeOptionalString(runtimeBotToken);

  if (botToken === undefined) {
    throw new ConfigError(
      "Telegram bot token is required. Set TELEGRAM_BOT_TOKEN or provide x-telegram-bot-token header in HTTP mode.",
      {
        details: {
          runtimeConfigured: runtimeBotToken !== undefined,
          headerConfigured: headerConfig.botToken !== undefined,
        },
      },
    );
  }

  return botToken;
}

function resolveChatId(
  toolChatId: string | undefined,
  runtimeDefaultChatId: string | undefined,
  headerConfig: HeaderConfig,
): string {
  const chatId =
    normalizeOptionalString(toolChatId) ??
    normalizeOptionalString(headerConfig.defaultChatId) ??
    normalizeOptionalString(runtimeDefaultChatId);

  if (chatId === undefined) {
    throw new ConfigError(
      "Telegram chat ID is required. Provide chatId in the tool call, set TELEGRAM_DEFAULT_CHAT_ID, or provide x-telegram-default-chat-id header in HTTP mode.",
      {
        details: {
          toolOverrideProvided: toolChatId !== undefined,
          runtimeConfigured: runtimeDefaultChatId !== undefined,
          headerConfigured: headerConfig.defaultChatId !== undefined,
        },
      },
    );
  }

  return chatId;
}

export function resolveRequestConfig(
  input: RequestConfigInput,
): ResolvedRequestConfig {
  const botToken = resolveBotToken(input.runtime.botToken, input.headerConfig);
  const effectiveChatId = resolveChatId(
    input.toolChatId,
    input.runtime.defaultChatId,
    input.headerConfig,
  );

  const resolved: ResolvedRequestConfig = {
    botToken,
    effectiveChatId,
    transportKind: input.transportKind,
  };

  const runtimeDefaultChatId = normalizeOptionalString(input.runtime.defaultChatId);
  if (runtimeDefaultChatId !== undefined) {
    resolved.runtimeDefaultChatId = runtimeDefaultChatId;
  }

  const headerDefaultChatId = normalizeOptionalString(input.headerConfig.defaultChatId);
  if (headerDefaultChatId !== undefined) {
    resolved.headerDefaultChatId = headerDefaultChatId;
  }

  const toolChatId = normalizeOptionalString(input.toolChatId);
  if (toolChatId !== undefined) {
    resolved.toolChatId = toolChatId;
  }

  return resolved;
}
