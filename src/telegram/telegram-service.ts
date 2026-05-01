import { Bot } from "grammy";
import type { Message } from "grammy/types";
import { run, type RunnerHandle } from "@grammyjs/runner";

import { TelegramError } from "../errors/telegram-error.js";
import type { AppLogger } from "../logging/logger.js";
import type {
  AskUserProgressHandlers,
  AskUserRequest,
  AskUserResponse,
  TelegramSendFileRequest,
  TelegramSendMessageRequest,
  TelegramSendMessageResult,
} from "../types/telegram.js";
import { addShutdownHandler } from "../utils/shutdown.js";
import { sendTelegramMedia } from "./file-sender.js";
import { PendingQuestionStore } from "./pending-question-store.js";
import { createReplyHandler } from "./update-router.js";

const WAITING_PROGRESS_INTERVAL_MS = 30_000;

function toTelegramError(message: string, error: unknown): TelegramError {
  if (error instanceof TelegramError) {
    return error;
  }

  return new TelegramError(message, {
    cause: error instanceof Error ? error : "Unknown Telegram error",
  });
}

function isPollingConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("409") &&
    error.message.includes("terminated by other getUpdates request")
  );
}

export class TelegramService {
  private readonly bot: Bot;

  private readonly logger: AppLogger;

  private readonly pendingQuestions = new PendingQuestionStore();

  private readonly replyHandler: (message: Message) => void;

  private runner: RunnerHandle | undefined;

  private pollingStartup: Promise<void> | undefined;

  public constructor(
    public readonly botToken: string,
    logger: AppLogger,
  ) {
    this.bot = new Bot(botToken);
    this.logger = logger.child({
      component: "telegram-service",
      tokenFingerprint: botToken.slice(-6),
    });
    this.replyHandler = createReplyHandler(this.pendingQuestions, this.logger);

    this.bot.on("message", async (context) => {
      const message = context.message;

      if (!("text" in message) && !("caption" in message)) {
        return;
      }

      this.replyHandler(message as Message);
    });

    addShutdownHandler(async () => {
      await this.shutdown();
    });
  }

  public async sendMessage(
    request: TelegramSendMessageRequest,
  ): Promise<TelegramSendMessageResult> {
    try {
      const sendOptions =
        request.options === undefined ? undefined : request.options;
      const message = await this.bot.api.sendMessage(
        request.chatId,
        request.text,
        sendOptions,
      );

      return {
        chatId: String(message.chat.id),
        messageId: message.message_id,
      };
    } catch (error: unknown) {
      throw toTelegramError("Failed to send Telegram message.", error);
    }
  }

  public async askUser(
    request: AskUserRequest,
    options?: AskUserProgressHandlers,
  ): Promise<AskUserResponse> {
    await this.ensurePolling();

    const answerPromise = this.pendingQuestions.createPendingQuestion({
      chatId: request.chatId,
      requestId: request.requestId,
    });

    let message: TelegramSendMessageResult;

    try {
      message = await this.sendMessage({
        chatId: request.chatId,
        text: request.question,
        options: {
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        },
      });
      this.pendingQuestions.bindOutgoingMessage(
        request.requestId,
        message.messageId,
      );
    } catch (error: unknown) {
      this.pendingQuestions.rejectPendingQuestion(
        request.requestId,
        toTelegramError("Failed to send Telegram question.", error),
      );
      answerPromise.catch(() => {});
      throw toTelegramError("Failed to send Telegram question.", error);
    }

    const progressInterval =
      options?.onProgress === undefined
        ? undefined
        : setInterval(() => {
            void options.onProgress?.(
              50,
              "Waiting for Telegram reply",
            );
          }, WAITING_PROGRESS_INTERVAL_MS);

    if (options?.signal) {
      options.signal.addEventListener(
        "abort",
        () => {
          this.pendingQuestions.rejectPendingQuestion(
            request.requestId,
            new TelegramError(
              "Telegram question was cancelled before a reply arrived.",
            ),
          );
        },
        { once: true },
      );
    }

    try {
      const answer = await answerPromise;

      return {
        answer,
        chatId: message.chatId,
        messageId: message.messageId,
        outboundMessageId: message.messageId,
      };
    } finally {
      if (progressInterval !== undefined) {
        clearInterval(progressInterval);
      }
    }
  }

  public async sendFile(
    request: TelegramSendFileRequest,
  ): Promise<TelegramSendMessageResult> {
    return sendTelegramMedia({
      api: this.bot.api,
      chatId: request.chatId,
      filePath: request.filePath,
      mediaKind: "document",
      ...(request.caption === undefined ? {} : { caption: request.caption }),
    });
  }

  public async sendImage(
    request: TelegramSendFileRequest,
  ): Promise<TelegramSendMessageResult> {
    return sendTelegramMedia({
      api: this.bot.api,
      chatId: request.chatId,
      filePath: request.filePath,
      mediaKind: "photo",
      ...(request.caption === undefined ? {} : { caption: request.caption }),
    });
  }

  public async sendVideo(
    request: TelegramSendFileRequest,
  ): Promise<TelegramSendMessageResult> {
    return sendTelegramMedia({
      api: this.bot.api,
      chatId: request.chatId,
      filePath: request.filePath,
      mediaKind: "video",
      ...(request.caption === undefined ? {} : { caption: request.caption }),
    });
  }

  public async shutdown(): Promise<void> {
    if (this.runner?.isRunning()) {
      await this.runner.stop();
    }

    this.runner = undefined;
    this.pollingStartup = undefined;
    this.pendingQuestions.rejectAll(
      new TelegramError(
        "Telegram polling stopped before pending questions were resolved.",
      ),
    );
  }

  private async ensurePolling(): Promise<void> {
    if (this.runner?.isRunning()) {
      return;
    }

    if (this.pollingStartup !== undefined) {
      await this.pollingStartup;
      return;
    }

    const startup = (async () => {
      try {
        this.logger.info("Starting Telegram polling for reply handling.");

        this.runner = run(this.bot, {
          runner: {
            fetch: {
              allowed_updates: ["message"],
              timeout: 30,
            },
            silent: true,
          },
        });

        const task = this.runner.task();
        if (task) {
          void task.catch((error: unknown) => {
            this.logger.error({ error }, "Telegram polling runner crashed.");
            this.runner = undefined;
            if (this.pollingStartup === startup) {
              this.pollingStartup = undefined;
            }
          });
        }
      } catch (error: unknown) {
        this.runner = undefined;
        if (this.pollingStartup === startup) {
          this.pollingStartup = undefined;
        }

        if (isPollingConflict(error)) {
          throw new TelegramError(
            "Telegram polling conflict detected. Make sure only one polling instance is using this bot token.",
          );
        }

        throw toTelegramError("Failed to start Telegram polling.", error);
      }
    })();

    this.pollingStartup = startup;

    await startup;
  }
}
