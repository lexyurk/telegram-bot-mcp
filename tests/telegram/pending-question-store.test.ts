import { PendingQuestionStore } from "../../src/telegram/pending-question-store.js";

describe("PendingQuestionStore", () => {
  it("resolves a matching reply from the same chat", async () => {
    const store = new PendingQuestionStore();
    const answerPromise = store.createPendingQuestion({
      chatId: "123",
      requestId: "req-1",
    });

    store.bindOutgoingMessage("req-1", 42);
    store.resolveFromIncomingReply({
      chatId: "123",
      replyToMessageId: 42,
      text: "hello",
    });

    await expect(answerPromise).resolves.toBe("hello");
    expect(store.size()).toBe(0);
  });

  it("ignores replies from a different chat", async () => {
    const store = new PendingQuestionStore();
    const answerPromise = store.createPendingQuestion({
      chatId: "123",
      requestId: "req-1",
    });

    store.bindOutgoingMessage("req-1", 42);
    const match = store.resolveFromIncomingReply({
      chatId: "999",
      replyToMessageId: 42,
      text: "hello",
    });

    expect(match).toBeUndefined();
    expect(store.size()).toBe(1);

    store.rejectPendingQuestion("req-1", new Error("cleanup"));
    await expect(answerPromise).rejects.toThrow("cleanup");
  });

  it("ignores non-reply messages", async () => {
    const store = new PendingQuestionStore();
    const answerPromise = store.createPendingQuestion({
      chatId: "123",
      requestId: "req-1",
    });

    store.bindOutgoingMessage("req-1", 42);
    const match = store.resolveFromIncomingReply({
      chatId: "123",
      replyToMessageId: undefined,
      text: "hello",
    });

    expect(match).toBeUndefined();
    expect(store.size()).toBe(1);

    store.rejectPendingQuestion("req-1", new Error("cleanup"));
    await expect(answerPromise).rejects.toThrow("cleanup");
  });
});
