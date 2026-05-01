import type { RequestInfo } from "@modelcontextprotocol/sdk/types.js";

import {
  resolveToolRequestConfig,
  withOptionalRequestInfo,
  withOptionalToolChatId,
} from "../tools/shared.js";
import type {
  ResolvedRequestConfig,
  RuntimeConfig,
} from "../types/config.js";
import type { AppLogger } from "../logging/logger.js";
import type { TelegramService } from "../telegram/telegram-service.js";
import type { TelegramServiceRegistry } from "../telegram/telegram-service-registry.js";

export interface ToolServices {
  logger: AppLogger;
  runtimeConfig: RuntimeConfig;
  telegramRegistry: TelegramServiceRegistry;
}

export interface RequestToolContext {
  logger: AppLogger;
  requestId: string;
  resolve: (toolChatId?: string) => {
    resolvedConfig: ResolvedRequestConfig;
    service: TelegramService;
  };
}

export function createRequestToolContext(options: {
  logger: AppLogger;
  requestId: string;
  requestInfo?: RequestInfo;
  runtimeConfig: RuntimeConfig;
  telegramRegistry: TelegramServiceRegistry;
}): RequestToolContext {
  return {
    logger: options.logger,
    requestId: options.requestId,
    resolve(toolChatId?: string) {
      const { resolvedConfig } = resolveToolRequestConfig({
        runtimeConfig: options.runtimeConfig,
        ...withOptionalRequestInfo(options.requestInfo),
        ...withOptionalToolChatId(toolChatId),
      });

      return {
        resolvedConfig,
        service: options.telegramRegistry.getService(resolvedConfig.botToken),
      };
    },
  };
}
