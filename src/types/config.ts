export type TransportMode = "stdio" | "http";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface RuntimeConfig {
  transport: TransportMode;
  port: number;
  botToken?: string | undefined;
  defaultChatId?: string | undefined;
  logLevel: LogLevel;
}

export interface HeaderConfig {
  botToken?: string | undefined;
  defaultChatId?: string | undefined;
}

export interface RequestConfigInput {
  runtime: Pick<RuntimeConfig, "botToken" | "defaultChatId">;
  headerConfig: HeaderConfig;
  toolChatId?: string | undefined;
  transportKind: TransportMode;
}

export interface ResolvedRequestConfig {
  botToken: string;
  effectiveChatId: string;
  runtimeDefaultChatId?: string | undefined;
  headerDefaultChatId?: string | undefined;
  toolChatId?: string | undefined;
  transportKind: TransportMode;
}

export interface RegisterToolsOptions {
  server: {
    registerTool: (
      name: string,
      config: {
        title?: string;
        description?: string;
        inputSchema?: unknown;
      },
      handler: (...args: any[]) => Promise<unknown>,
    ) => unknown;
  };
  logger: import("../logging/logger.js").AppLogger;
  runtimeConfig: RuntimeConfig;
  telegramRegistry: import("../telegram/telegram-service-registry.js").TelegramServiceRegistry;
}
