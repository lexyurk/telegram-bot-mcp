import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ProgressToken,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "../../src/logging/logger.js";
import { askUserToolHandler } from "../../src/tools/ask-user.js";
import { createNotifyUserTool } from "../../src/tools/notify-user.js";
import { createSendFileTool } from "../../src/tools/send-file.js";
import { createSendImageTool } from "../../src/tools/send-image.js";
import { createSendVideoTool } from "../../src/tools/send-video.js";
import type { ResolvedRequestConfig, RuntimeConfig } from "../../src/types/config.js";
import type {
  AskUserResponse,
  TelegramSendMessageResult,
  TelegramServiceLike,
} from "../../src/types/telegram.js";
import type { RequestToolContext, ToolServices } from "../../src/server/tool-context.js";

const runtimeConfig: RuntimeConfig = {
  transport: "http",
  port: 3000,
  logLevel: "info",
  botToken: "env-token",
  defaultChatId: "env-chat",
};

function createExtra(
  headers?: Record<string, string | string[] | undefined>,
  progressToken?: ProgressToken,
): RequestHandlerExtra<ServerRequest, ServerNotification> {
  const extra: RequestHandlerExtra<ServerRequest, ServerNotification> = {
    signal: new AbortController().signal,
    requestId: "req-1",
    sendNotification: vi.fn(async () => undefined),
    sendRequest: vi.fn(async () => {
      throw new Error("sendRequest should not be called in tests");
    }),
  };

  if (headers) {
    extra.requestInfo = { headers };
  }

  if (progressToken !== undefined) {
    extra._meta = { progressToken };
  }

  return extra;
}

function createResolvedConfig(
  overrides?: Partial<ResolvedRequestConfig>,
): ResolvedRequestConfig {
  const base: ResolvedRequestConfig = {
    botToken: "token",
    effectiveChatId: "chat-123",
    transportKind: "http",
  };

  if (overrides?.runtimeDefaultChatId !== undefined) {
    base.runtimeDefaultChatId = overrides.runtimeDefaultChatId;
  } else {
    base.runtimeDefaultChatId = "env-chat";
  }

  if (overrides?.headerDefaultChatId !== undefined) {
    base.headerDefaultChatId = overrides.headerDefaultChatId;
  }

  if (overrides?.toolChatId !== undefined) {
    base.toolChatId = overrides.toolChatId;
  }

  return {
    ...base,
    ...overrides,
  };
}

function getTextContent(result: CallToolResult): string {
  const firstContent = result.content?.[0];

  if (!firstContent || firstContent.type !== "text") {
    throw new Error("Expected text content");
  }

  return firstContent.text;
}

function createMinimalService(
  overrides: Partial<TelegramServiceLike>,
): TelegramServiceLike {
  return {
    askUser: vi.fn(async () => ({
      answer: "unused",
      chatId: "unused",
      messageId: 0,
      outboundMessageId: 0,
    })),
    sendMessage: vi.fn(async () => ({ chatId: "unused", messageId: 0 })),
    sendFile: vi.fn(async () => ({ chatId: "unused", messageId: 0 })),
    sendImage: vi.fn(async () => ({ chatId: "unused", messageId: 0 })),
    sendVideo: vi.fn(async () => ({ chatId: "unused", messageId: 0 })),
    ...overrides,
  };
}

describe("tool handlers", () => {
  const logger = createLogger("info");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks user and emits progress notifications", async () => {
    const askUser = vi.fn<TelegramServiceLike["askUser"]>();

    const response: AskUserResponse = {
      answer: "yes",
      chatId: "chat-123",
      messageId: 42,
      outboundMessageId: 42,
    };

    askUser.mockResolvedValue(response);

    const getService = vi.fn().mockReturnValue({ askUser });
    const extra = createExtra(
      {
        "x-telegram-bot-token": "header-token",
        "x-telegram-default-chat-id": "header-chat",
      },
      "progress-1",
    );

    const telegramRegistry = {
      getService,
      shutdownAll: vi.fn(async () => undefined),
    } as unknown as ToolServices["telegramRegistry"];

    const result = await askUserToolHandler(
      {
        question: "Continue?",
      },
      extra,
      {
        logger,
        runtimeConfig,
        telegramRegistry,
      },
    );

    expect(getService).toHaveBeenCalledWith("header-token");
    expect(askUser).toHaveBeenCalledWith(
      {
        chatId: "header-chat",
        question: "Continue?",
        requestId: "req-1",
      },
      expect.objectContaining({
        signal: extra.signal,
        onProgress: expect.any(Function),
      }),
    );
    expect(extra.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "notifications/progress",
      }),
    );
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "yes",
        },
      ],
    });
  });

  it("sends notification using resolved runtime config", async () => {
    const sendMessage = vi.fn<
      (request: { chatId: string; text: string }) => Promise<TelegramSendMessageResult>
    >();

    sendMessage.mockResolvedValue({
      chatId: "env-chat",
      messageId: 10,
    });

    const context = {
      logger,
      requestId: "req-3",
      resolve(toolChatId) {
        expect(toolChatId).toBeUndefined();
        return {
          resolvedConfig: createResolvedConfig({
            botToken: "env-token",
            effectiveChatId: "env-chat",
            transportKind: "http",
          }),
          service: createMinimalService({
            sendMessage,
          }),
        };
      },
    } as RequestToolContext;

    const result = await createNotifyUserTool(context)({
      message: "done",
    });

    expect(sendMessage).toHaveBeenCalledWith({
      chatId: "env-chat",
      text: "done",
    });
    expect(getTextContent(result)).toContain("env-chat");
  });

  it("routes send file, image, and video via request context", async () => {
    const sendFile = vi.fn().mockResolvedValue({ chatId: "chat-1", messageId: 1 });
    const sendImage = vi.fn().mockResolvedValue({ chatId: "chat-1", messageId: 2 });
    const sendVideo = vi.fn().mockResolvedValue({ chatId: "chat-1", messageId: 3 });

    const context = {
      logger,
      requestId: "req-2",
      resolve(toolChatId?: string) {
        expect(toolChatId).toBe("override-chat");
        return {
          resolvedConfig: createResolvedConfig({
            effectiveChatId: "override-chat",
          }),
          service: createMinimalService({
            sendFile,
            sendImage,
            sendVideo,
          }),
        };
      },
    } as RequestToolContext;

    const fileResult = await createSendFileTool(context)({
      chatId: "override-chat",
      filePath: "/tmp/a.txt",
      caption: "doc",
    });
    const imageResult = await createSendImageTool(context)({
      chatId: "override-chat",
      filePath: "/tmp/a.png",
      caption: "image",
    });
    const videoResult = await createSendVideoTool(context)({
      chatId: "override-chat",
      filePath: "/tmp/a.mp4",
      caption: "video",
    });

    expect(sendFile).toHaveBeenCalledWith({
      chatId: "override-chat",
      filePath: "/tmp/a.txt",
      caption: "doc",
    });
    expect(sendImage).toHaveBeenCalledWith({
      chatId: "override-chat",
      filePath: "/tmp/a.png",
      caption: "image",
    });
    expect(sendVideo).toHaveBeenCalledWith({
      chatId: "override-chat",
      filePath: "/tmp/a.mp4",
      caption: "video",
    });

    expect(getTextContent(fileResult)).toContain("File sent successfully");
    expect(getTextContent(imageResult)).toContain("Image sent successfully");
    expect(getTextContent(videoResult)).toContain("Video sent successfully");
  });

  it("passes parseMode and silent through notify_user", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      chatId: "env-chat",
      messageId: 11,
    });

    const context = {
      logger,
      requestId: "req-notify-fmt",
      resolve() {
        return {
          resolvedConfig: createResolvedConfig({
            botToken: "env-token",
            effectiveChatId: "env-chat",
            transportKind: "http",
          }),
          service: createMinimalService({ sendMessage }),
        };
      },
    } as RequestToolContext;

    await createNotifyUserTool(context)({
      message: "<b>done</b>",
      parseMode: "HTML",
      silent: true,
    });

    expect(sendMessage).toHaveBeenCalledWith({
      chatId: "env-chat",
      text: "<b>done</b>",
      parseMode: "HTML",
      silent: true,
    });
  });

  it("passes parseMode and silent through send_image", async () => {
    const sendImage = vi.fn().mockResolvedValue({ chatId: "c", messageId: 7 });

    const context = {
      logger,
      requestId: "req-img-fmt",
      resolve() {
        return {
          resolvedConfig: createResolvedConfig({ effectiveChatId: "c" }),
          service: createMinimalService({ sendImage }),
        };
      },
    } as RequestToolContext;

    await createSendImageTool(context)({
      filePath: "/tmp/x.png",
      caption: "<i>shot</i>",
      parseMode: "HTML",
      silent: true,
    });

    expect(sendImage).toHaveBeenCalledWith({
      chatId: "c",
      filePath: "/tmp/x.png",
      caption: "<i>shot</i>",
      parseMode: "HTML",
      silent: true,
    });
  });

  it("passes parseMode and timeoutSeconds through ask_user", async () => {
    const askUser = vi.fn<TelegramServiceLike["askUser"]>();
    askUser.mockResolvedValue({
      answer: "ok",
      chatId: "env-chat",
      messageId: 1,
      outboundMessageId: 1,
    });

    const getService = vi.fn().mockReturnValue({ askUser });
    const extra = createExtra();

    const telegramRegistry = {
      getService,
      shutdownAll: vi.fn(async () => undefined),
    } as unknown as ToolServices["telegramRegistry"];

    await askUserToolHandler(
      {
        question: "<b>Approve?</b>",
        parseMode: "HTML",
        timeoutSeconds: 30,
      },
      extra,
      {
        logger,
        runtimeConfig,
        telegramRegistry,
      },
    );

    expect(askUser).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "env-chat",
        question: "<b>Approve?</b>",
        parseMode: "HTML",
        timeoutMs: 30_000,
      }),
      expect.objectContaining({ signal: extra.signal }),
    );
  });
});
