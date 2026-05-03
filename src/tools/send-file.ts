import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SendFileArgs } from "../types/tool-args.js";
import type { RequestToolContext } from "../server/tool-context.js";
import type { TelegramSendFileRequest } from "../types/telegram.js";

function buildRequest(
  chatId: string,
  args: SendFileArgs,
): TelegramSendFileRequest {
  const request: TelegramSendFileRequest = {
    chatId,
    filePath: args.filePath,
  };

  if (args.caption !== undefined) {
    request.caption = args.caption;
  }
  if (args.parseMode !== undefined) {
    request.parseMode = args.parseMode;
  }
  if (args.silent === true) {
    request.silent = true;
  }

  return request;
}

export function createSendFileTool(context: RequestToolContext) {
  return async (args: SendFileArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const result = await service.sendFile(
      buildRequest(resolvedConfig.effectiveChatId, args),
    );

    context.logger.info(
      {
        requestId: context.requestId,
        chatId: result.chatId,
        messageId: result.messageId,
        filePath: args.filePath,
      },
      "Telegram file sent",
    );

    return {
      content: [
        {
          type: "text",
          text: `File sent successfully to chat ${result.chatId} (message ${result.messageId}).`,
        },
      ],
    };
  };
}
