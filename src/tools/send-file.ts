import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SendFileArgs } from "../types/tool-args.js";
import type { RequestToolContext } from "../server/tool-context.js";

function withOptionalCaption(filePath: string, chatId: string, caption?: string) {
  return caption === undefined
    ? { chatId, filePath }
    : { chatId, filePath, caption };
}

export function createSendFileTool(context: RequestToolContext) {
  return async (args: SendFileArgs): Promise<CallToolResult> => {
    const { resolvedConfig, service } = context.resolve(args.chatId);
    const result = await service.sendFile(
      withOptionalCaption(
        args.filePath,
        resolvedConfig.effectiveChatId,
        args.caption,
      ),
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
