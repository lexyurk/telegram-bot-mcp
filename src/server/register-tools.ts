import { z } from "zod";

import { askUserToolHandler } from "../tools/ask-user.js";
import { createNotifyUserTool } from "../tools/notify-user.js";
import { createSendFileTool } from "../tools/send-file.js";
import { createSendImageTool } from "../tools/send-image.js";
import { createSendVideoTool } from "../tools/send-video.js";
import { createRequestToolContext, type ToolServices } from "./tool-context.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const chatIdSchema = z.string().trim().min(1).optional();
const filePathSchema = z.string().trim().min(1);
const captionSchema = z.string().trim().min(1).max(1024).optional();

function withOptionalProperties<
  T extends object,
  P extends Record<string, unknown>,
>(base: T, optional: P): T & Partial<P> {
  let result: T & Partial<P> = { ...base };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      result = {
        ...result,
        [key]: value,
      };
    }
  }

  return result;
}

export interface RegisterToolsOptions extends ToolServices {
  server: McpServer;
}

export function registerTools(options: RegisterToolsOptions): void {
  const { server, ...services } = options;

  server.registerTool(
    "ask_user",
    {
      title: "Ask User",
      description:
        "Ask a Telegram user a question and wait indefinitely for a reply to the sent message.",
      inputSchema: z.object({
        question: z.string().trim().min(1),
        chatId: chatIdSchema,
      }),
    },
    async (args, extra) =>
      askUserToolHandler(
        withOptionalProperties(
          {
            question: args.question,
          },
          {
            chatId: args.chatId,
          },
        ),
        extra,
        services,
      ),
  );

  server.registerTool(
    "notify_user",
    {
      title: "Notify User",
      description:
        "Send a Telegram notification that does not require a response.",
      inputSchema: z.object({
        message: z.string().trim().min(1),
        chatId: chatIdSchema,
      }),
    },
    async (args, extra) => {
      const context = createRequestToolContext({
        logger: services.logger,
        requestId: String(extra.requestId),
        runtimeConfig: services.runtimeConfig,
        telegramRegistry: services.telegramRegistry,
        ...(extra.requestInfo ? { requestInfo: extra.requestInfo } : {}),
      });

      return createNotifyUserTool(context)(
        withOptionalProperties(
          {
            message: args.message,
          },
          {
            chatId: args.chatId,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_file",
    {
      title: "Send File",
      description: "Send a generic file to a Telegram user.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
      }),
    },
    async (args, extra) => {
      const context = createRequestToolContext({
        logger: services.logger,
        requestId: String(extra.requestId),
        runtimeConfig: services.runtimeConfig,
        telegramRegistry: services.telegramRegistry,
        ...(extra.requestInfo ? { requestInfo: extra.requestInfo } : {}),
      });

      return createSendFileTool(context)(
        withOptionalProperties(
          {
            filePath: args.filePath,
          },
          {
            caption: args.caption,
            chatId: args.chatId,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_image",
    {
      title: "Send Image",
      description: "Send an image to a Telegram user.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
      }),
    },
    async (args, extra) => {
      const context = createRequestToolContext({
        logger: services.logger,
        requestId: String(extra.requestId),
        runtimeConfig: services.runtimeConfig,
        telegramRegistry: services.telegramRegistry,
        ...(extra.requestInfo ? { requestInfo: extra.requestInfo } : {}),
      });

      return createSendImageTool(context)(
        withOptionalProperties(
          {
            filePath: args.filePath,
          },
          {
            caption: args.caption,
            chatId: args.chatId,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_video",
    {
      title: "Send Video",
      description: "Send a video to a Telegram user.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
      }),
    },
    async (args, extra) => {
      const context = createRequestToolContext({
        logger: services.logger,
        requestId: String(extra.requestId),
        runtimeConfig: services.runtimeConfig,
        telegramRegistry: services.telegramRegistry,
        ...(extra.requestInfo ? { requestInfo: extra.requestInfo } : {}),
      });

      return createSendVideoTool(context)(
        withOptionalProperties(
          {
            filePath: args.filePath,
          },
          {
            caption: args.caption,
            chatId: args.chatId,
          },
        ),
      );
    },
  );
}
