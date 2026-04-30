import type { Message } from "grammy/types";
import type { Logger } from "pino";

import type { IncomingReplyEnvelope } from "../types/telegram.js";
import { PendingQuestionStore } from "./pending-question-store.js";

const normalizeText = (message: Message): string | undefined => {
  if ("text" in message && typeof message.text === "string") {
    return message.text;
  }

  if ("caption" in message && typeof message.caption === "string") {
    return message.caption;
  }

  return undefined;
};

export function toIncomingReplyEnvelope(
  message: Message,
): IncomingReplyEnvelope {
  const reply: IncomingReplyEnvelope = {
    chatId: String(message.chat.id),
    replyToMessageId: undefined,
    text: undefined,
  };

  if (message.reply_to_message?.message_id !== undefined) {
    reply.replyToMessageId = message.reply_to_message.message_id;
  }

  const text = normalizeText(message);
  if (text !== undefined) {
    reply.text = text;
  }

  return reply;
}

export function createReplyHandler(
  pendingQuestions: PendingQuestionStore,
  logger: Logger,
): (message: Message) => void {
  return (message) => {
    const reply = toIncomingReplyEnvelope(message);
    const matchedQuestion = pendingQuestions.resolveFromIncomingReply(reply);

    if (matchedQuestion === undefined) {
      logger.debug(
        {
          chatId: reply.chatId,
          replyToMessageId: reply.replyToMessageId,
        },
        "Ignored non-matching Telegram reply",
      );
      return;
    }

    logger.info(
      {
        chatId: matchedQuestion.chatId,
        outboundMessageId: matchedQuestion.outboundMessageId,
        requestId: matchedQuestion.requestId,
      },
      "Resolved pending Telegram question from reply",
    );
  };
}
