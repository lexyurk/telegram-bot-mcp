import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

import type { AskUserArgs } from "../types/tool-args.js";
import type { ToolServices } from "../server/tool-context.js";
import {
  resolveToolRequestConfig,
  withOptionalRequestInfo,
  withOptionalToolChatId,
} from "./shared.js";

function withOptionalProgressHandler(
  onProgress: ReturnType<typeof createProgressNotifier>,
): {
  onProgress?: (progress: number, message: string) => Promise<void>;
} {
  if (onProgress === undefined) {
    return {};
  }

  return { onProgress };
}

function createProgressNotifier(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) {
  const progressToken = extra._meta?.progressToken;

  if (progressToken === undefined) {
    return undefined;
  }

  return async (progress: number, message: string) => {
    await extra.sendNotification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress,
        total: 100,
        message,
      },
    });
  };
}

export async function askUserToolHandler(
  args: AskUserArgs,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  services: ToolServices,
): Promise<CallToolResult> {
  const { resolvedConfig } = resolveToolRequestConfig({
    runtimeConfig: services.runtimeConfig,
    ...withOptionalRequestInfo(extra.requestInfo),
    ...withOptionalToolChatId(args.chatId),
  });
  const telegramService = services.telegramRegistry.getService(
    resolvedConfig.botToken,
  );
  const notifyProgress = createProgressNotifier(extra);

  if (notifyProgress) {
    await notifyProgress(5, "Sending Telegram question");
  }

  const answer = await telegramService.askUser(
    {
      chatId: resolvedConfig.effectiveChatId,
      question: args.question,
      requestId: String(extra.requestId),
    },
    {
      signal: extra.signal,
      ...withOptionalProgressHandler(notifyProgress),
    },
  );

  services.logger.info(
    {
      requestId: extra.requestId,
      chatId: resolvedConfig.effectiveChatId,
      messageId: answer.outboundMessageId,
      transport: resolvedConfig.transportKind,
    },
    "Telegram question resolved",
  );

  return {
    content: [
      {
        type: "text",
        text: answer.answer,
      },
    ],
  };
}
