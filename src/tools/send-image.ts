import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SendImageArgs } from "../types/tool-args.js";
import type { RequestToolContext } from "../server/tool-context.js";

export function createSendImageTool(context: RequestToolContext) {
  return async (args: SendImageArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const request = {
      chatId: resolvedConfig.effectiveChatId,
      filePath: args.filePath,
    };
    const result = await service.sendImage(
      args.caption === undefined ? request : { ...request, caption: args.caption },
    );

    context.logger.info(
      {
        requestId: context.requestId,
        chatId: result.chatId,
        messageId: result.messageId,
        filePath: args.filePath,
      },
      "Telegram image sent",
    );

    return {
      content: [
        {
          type: "text",
          text: `Image sent successfully to chat ${result.chatId} (message ${result.messageId}).`,
        },
      ],
    };
  };
}
