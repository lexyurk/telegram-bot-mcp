import { z } from "zod";

import { askUserToolHandler } from "../tools/ask-user.js";
import { createNotifyUserTool } from "../tools/notify-user.js";
import { createSendFileTool } from "../tools/send-file.js";
import { createSendImageTool } from "../tools/send-image.js";
import { createSendVideoTool } from "../tools/send-video.js";
import { createRequestToolContext, type ToolServices } from "./tool-context.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const chatIdSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    "Optional Telegram chat ID. Overrides the default chat ID from header/env config.",
  );
const filePathSchema = z
  .string()
  .trim()
  .min(1)
  .describe("Absolute path on the server's filesystem to the file to send.");
const captionSchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .optional()
  .describe(
    "Optional caption shown beneath the media. Telegram limit: 1024 characters.",
  );
const parseModeSchema = z
  .enum(["HTML", "MarkdownV2"])
  .optional()
  .describe(
    "Optional Telegram parse mode for formatting (defaults to plain text). Use HTML for the most forgiving formatting.",
  );
const silentSchema = z
  .boolean()
  .optional()
  .describe(
    "When true, send the message silently (no notification sound on the user's device).",
  );

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
        "Send a Telegram question to a user and wait for their reply. " +
        "The user must reply directly to the bot's message (force_reply is set). " +
        "Use this for human-in-the-loop confirmations, approvals, or open questions.",
      inputSchema: z.object({
        question: z
          .string()
          .trim()
          .min(1)
          .describe("The question text sent to the user."),
        chatId: chatIdSchema,
        parseMode: parseModeSchema,
        timeoutSeconds: z
          .number()
          .int()
          .min(1)
          .max(86_400)
          .optional()
          .describe(
            "Optional timeout in seconds. If unset the tool waits indefinitely (until the MCP client cancels).",
          ),
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
            parseMode: args.parseMode,
            timeoutSeconds: args.timeoutSeconds,
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
        "Send a Telegram notification message that does not require a response. " +
        "Use for status updates, alerts, completion notices, and other one-way notifications.",
      inputSchema: z.object({
        message: z
          .string()
          .trim()
          .min(1)
          .describe("The notification text to send."),
        chatId: chatIdSchema,
        parseMode: parseModeSchema,
        silent: silentSchema,
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
            parseMode: args.parseMode,
            silent: args.silent,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_file",
    {
      title: "Send File",
      description:
        "Send any file as a Telegram document. Use this for logs, reports, archives, or " +
        "anything you want delivered as a downloadable attachment regardless of MIME type.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
        parseMode: parseModeSchema,
        silent: silentSchema,
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
            parseMode: args.parseMode,
            silent: args.silent,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_image",
    {
      title: "Send Image",
      description:
        "Send an image (PNG/JPEG/GIF/WebP/etc.) to a Telegram user. " +
        "Telegram will compress and display it inline.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
        parseMode: parseModeSchema,
        silent: silentSchema,
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
            parseMode: args.parseMode,
            silent: args.silent,
          },
        ),
      );
    },
  );

  server.registerTool(
    "send_video",
    {
      title: "Send Video",
      description:
        "Send a video file (MP4/MOV/etc.) to a Telegram user. Telegram will display it inline " +
        "with a thumbnail and player.",
      inputSchema: z.object({
        filePath: filePathSchema,
        caption: captionSchema,
        chatId: chatIdSchema,
        parseMode: parseModeSchema,
        silent: silentSchema,
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
            parseMode: args.parseMode,
            silent: args.silent,
          },
        ),
      );
    },
  );
}
