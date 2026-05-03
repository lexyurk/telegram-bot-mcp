import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SendVideoArgs } from "../types/tool-args.js";
import type { RequestToolContext } from "../server/tool-context.js";
import type { TelegramSendFileRequest } from "../types/telegram.js";

function buildRequest(
  chatId: string,
  args: SendVideoArgs,
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

export function createSendVideoTool(context: RequestToolContext) {
  return async (args: SendVideoArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const result = await service.sendVideo(
      buildRequest(resolvedConfig.effectiveChatId, args),
    );

    context.logger.info(
      {
        requestId: context.requestId,
        chatId: result.chatId,
        messageId: result.messageId,
        filePath: args.filePath,
      },
      "Telegram video sent",
    );

    return {
      content: [
        {
          type: "text",
          text: `Video sent successfully to chat ${result.chatId} (message ${result.messageId}).`,
        },
      ],
    };
  };
}
