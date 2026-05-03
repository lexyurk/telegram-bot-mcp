import { InputFile } from "grammy";
import type { Api } from "grammy";
import type { Message } from "grammy/types";

import { TelegramError } from "../errors/telegram-error.js";
import type {
  ChatId,
  TelegramMediaKind,
  TelegramParseMode,
  TelegramSendMessageResult,
} from "../types/telegram.js";
import { assertReadableFile } from "../utils/fs.js";
import {
  assertMediaKindMatchesFile,
  getFilenameFromPath,
  getTelegramMediaKindForPath,
} from "../utils/mime.js";

function buildSendOptions(
  caption: string | undefined,
  parseMode: TelegramParseMode | undefined,
  silent: boolean | undefined,
): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  if (caption !== undefined) {
    options.caption = caption;
  }

  if (parseMode !== undefined) {
    options.parse_mode = parseMode;
  }

  if (silent === true) {
    options.disable_notification = true;
  }

  return options;
}

function toTelegramSendResult(message: Message): TelegramSendMessageResult {
  return {
    messageId: message.message_id,
    chatId: String(message.chat.id),
  };
}

export async function sendTelegramMedia(options: {
  api: Api;
  chatId: ChatId;
  filePath: string;
  caption?: string | undefined;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
  mediaKind: TelegramMediaKind;
}): Promise<TelegramSendMessageResult> {
  const { api, chatId, filePath, caption, parseMode, silent, mediaKind } =
    options;

  await assertReadableFile(filePath);

  if (mediaKind !== "document") {
    assertMediaKindMatchesFile(filePath, mediaKind);
  }

  const inputFile = new InputFile(filePath, getFilenameFromPath(filePath));
  const sendOptions = buildSendOptions(caption, parseMode, silent);

  try {
    switch (mediaKind) {
      case "document": {
        const message = await api.sendDocument(chatId, inputFile, sendOptions);
        return toTelegramSendResult(message);
      }
      case "photo": {
        const message = await api.sendPhoto(chatId, inputFile, sendOptions);
        return toTelegramSendResult(message);
      }
      case "video": {
        const message = await api.sendVideo(chatId, inputFile, sendOptions);
        return toTelegramSendResult(message);
      }
      default: {
        const exhaustiveCheck: never = mediaKind;
        throw new TelegramError(
          `Unsupported media kind: ${String(exhaustiveCheck)}`,
        );
      }
    }
  } catch (error) {
    throw new TelegramError("Failed to send Telegram media.", {
      details: {
        chatId,
        filePath,
        mediaKind,
        inferredMediaKind: getTelegramMediaKindForPath(filePath),
        cause: error instanceof Error ? error.message : "Unknown error",
      },
      cause: error,
    });
  }
}
