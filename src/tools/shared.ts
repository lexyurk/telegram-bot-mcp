import type { RequestInfo } from "@modelcontextprotocol/sdk/types.js";

import { parseHeaderConfig } from "../config/headers.js";
import { resolveRequestConfig } from "../config/resolve-request-config.js";
import type {
  HeaderConfig,
  ResolvedRequestConfig,
  RuntimeConfig,
} from "../types/config.js";

function withOptionalProperty<T extends object, K extends string, V>(
  object: T,
  key: K,
  value: V | undefined,
): T & Partial<Record<K, V>> {
  if (value === undefined) {
    return object;
  }

  return {
    ...object,
    [key]: value,
  };
}

export function withOptionalRequestInfo(
  requestInfo: RequestInfo | undefined,
): { requestInfo?: RequestInfo } {
  if (requestInfo === undefined) {
    return {};
  }

  return { requestInfo };
}

export function withOptionalToolChatId(
  toolChatId: string | undefined,
): { toolChatId?: string } {
  if (toolChatId === undefined) {
    return {};
  }

  return { toolChatId };
}

export function resolveToolRequestConfig(options: {
  runtimeConfig: RuntimeConfig;
  requestInfo?: RequestInfo;
  toolChatId?: string;
}): {
  headerConfig: HeaderConfig;
  resolvedConfig: ResolvedRequestConfig;
} {
  const headerConfig = parseHeaderConfig(options.requestInfo?.headers);
  const resolvedConfig = resolveRequestConfig(
    withOptionalProperty(
      {
        runtime: options.runtimeConfig,
        headerConfig,
        transportKind: options.runtimeConfig.transport,
      },
      "toolChatId",
      options.toolChatId,
    ),
  );

  return {
    headerConfig,
    resolvedConfig,
  };
}
