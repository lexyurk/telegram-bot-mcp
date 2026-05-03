import { z } from "zod";

import { ConfigError } from "../errors/config-error.js";
import type { LogLevel, RuntimeConfig, TransportMode } from "../types/config.js";

const logLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const satisfies readonly LogLevel[];

const transportModes = ["stdio", "http"] as const satisfies readonly TransportMode[];

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1).optional(),
  TELEGRAM_DEFAULT_CHAT_ID: z.string().trim().min(1).optional(),
  TELEGRAM_BOT_MCP_TRANSPORT: z.enum(transportModes).default("stdio"),
  TELEGRAM_BOT_MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TELEGRAM_BOT_MCP_LOG_LEVEL: z.enum(logLevels).default("info"),
});

export function loadRuntimeConfig(
  source: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new ConfigError("Invalid Telegram Bot MCP environment configuration.", {
      issues: parsed.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.join("."),
      })),
    });
  }

  return {
    transport: parsed.data.TELEGRAM_BOT_MCP_TRANSPORT,
    port: parsed.data.TELEGRAM_BOT_MCP_PORT,
    logLevel: parsed.data.TELEGRAM_BOT_MCP_LOG_LEVEL,
    ...(parsed.data.TELEGRAM_BOT_TOKEN
      ? { botToken: parsed.data.TELEGRAM_BOT_TOKEN }
      : {}),
    ...(parsed.data.TELEGRAM_DEFAULT_CHAT_ID
      ? { defaultChatId: parsed.data.TELEGRAM_DEFAULT_CHAT_ID }
      : {}),
  };
}
