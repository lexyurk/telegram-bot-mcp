import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { RequestToolContext } from "../server/tool-context.js";
import type { NotifyUserArgs } from "../types/tool-args.js";

export function createNotifyUserTool(context: RequestToolContext) {
  return async (args: NotifyUserArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const result = await service.sendMessage({
      chatId: resolvedConfig.effectiveChatId,
      text: args.message,
      options: undefined,
    });

    context.logger.info(
      {
        requestId: context.requestId,
        chatId: result.chatId,
        messageId: result.messageId,
      },
      "Telegram notification sent",
    );

    return {
      content: [
        {
          type: "text",
          text: `Notification sent successfully to chat ${result.chatId} (message ${result.messageId}).`,
        },
      ],
    };
  };
}
