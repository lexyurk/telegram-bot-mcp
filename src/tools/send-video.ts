import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SendVideoArgs } from "../types/tool-args.js";
import type { RequestToolContext } from "../server/tool-context.js";

export function createSendVideoTool(context: RequestToolContext) {
  return async (args: SendVideoArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const result = await service.sendVideo(
      args.caption === undefined
        ? {
            chatId: resolvedConfig.effectiveChatId,
            filePath: args.filePath,
          }
        : {
            chatId: resolvedConfig.effectiveChatId,
            filePath: args.filePath,
            caption: args.caption,
          },
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
