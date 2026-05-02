import { describe, expect, it } from "vitest";

import { toIncomingReplyEnvelope } from "../../src/telegram/update-router.js";

describe("toIncomingReplyEnvelope", () => {
  it("extracts reply metadata and text from a Telegram message", () => {
    const message = {
      message_id: 99,
      date: 1,
      chat: {
        id: 123,
        type: "private",
      },
      text: "hello",
      reply_to_message: {
        message_id: 55,
        date: 1,
        chat: {
          id: 123,
          type: "private",
        },
      },
    } as const;

    expect(toIncomingReplyEnvelope(message as never)).toEqual({
      chatId: "123",
      replyToMessageId: 55,
      text: "hello",
    });
  });

  it("falls back to caption when text is unavailable", () => {
    const message = {
      message_id: 100,
      date: 1,
      chat: {
        id: 456,
        type: "private",
      },
      caption: "photo caption",
    } as const;

    expect(toIncomingReplyEnvelope(message as never)).toEqual({
      chatId: "456",
      replyToMessageId: undefined,
      text: "photo caption",
    });
  });
});
