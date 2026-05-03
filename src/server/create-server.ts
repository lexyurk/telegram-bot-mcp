import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import packageJson from "../../package.json" with { type: "json" };
import type { RuntimeConfig } from "../types/config.js";
import type { AppLogger } from "../logging/logger.js";
import {
  TelegramServiceRegistry,
} from "../telegram/telegram-service-registry.js";
import { registerTools } from "./register-tools.js";

export interface ServerDependencies {
  logger: AppLogger;
  runtimeConfig: RuntimeConfig;
  telegramServiceRegistry: TelegramServiceRegistry;
}

export function createServerDependencies(options: {
  logger: AppLogger;
  runtimeConfig: RuntimeConfig;
}): ServerDependencies {
  const telegramServiceRegistry = new TelegramServiceRegistry(
    options.logger,
  );

  return {
    logger: options.logger,
    runtimeConfig: options.runtimeConfig,
    telegramServiceRegistry,
  };
}

export function createServer({
  logger,
  runtimeConfig,
  telegramServiceRegistry,
}: ServerDependencies): McpServer {
  const server = new McpServer(
    {
      name: "telegram-bot-mcp",
      version: packageJson.version,
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerTools({
    server,
    logger,
    runtimeConfig,
    telegramRegistry: telegramServiceRegistry,
  });

  return server;
}
