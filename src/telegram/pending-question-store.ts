import { TelegramError } from "../errors/telegram-error.js";
import type {
  BoundPendingQuestion,
  IncomingReplyEnvelope,
  PendingQuestionRecord,
  PendingQuestionMatch,
} from "../types/telegram.js";

export class PendingQuestionStore {
  private readonly pendingByRequestId = new Map<string, PendingQuestionRecord>();

  private readonly pendingByMessageId = new Map<number, BoundPendingQuestion>();

  private findBoundQuestionByRequestId(
    requestId: string,
  ): BoundPendingQuestion | undefined {
    for (const pendingQuestion of this.pendingByMessageId.values()) {
      if (pendingQuestion.requestId === requestId) {
        return pendingQuestion;
      }
    }

    return undefined;
  }

  public createPendingQuestion(input: {
    chatId: string;
    requestId: string;
  }): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.pendingByRequestId.set(input.requestId, {
        chatId: input.chatId,
        createdAt: Date.now(),
        requestId: input.requestId,
        resolve,
        reject,
      });
    });
  }

  public bindOutgoingMessage(requestId: string, outboundMessageId: number): void {
    const pendingQuestion = this.pendingByRequestId.get(requestId);

    if (pendingQuestion === undefined) {
      throw new TelegramError("Cannot bind outbound Telegram message to an unknown request.", {
        details: {
          outboundMessageId,
          requestId,
        },
      });
    }

    const boundQuestion: BoundPendingQuestion = {
      ...pendingQuestion,
      outboundMessageId,
    };

    this.pendingByRequestId.delete(requestId);
    this.pendingByMessageId.set(outboundMessageId, boundQuestion);
  }

  public resolveFromIncomingReply(
    reply: IncomingReplyEnvelope,
  ): PendingQuestionMatch | undefined {
    if (reply.replyToMessageId === undefined || reply.text === undefined) {
      return undefined;
    }

    const pendingQuestion = this.pendingByMessageId.get(reply.replyToMessageId);

    if (pendingQuestion === undefined) {
      return undefined;
    }

    if (pendingQuestion.chatId !== reply.chatId) {
      return undefined;
    }

    this.pendingByMessageId.delete(reply.replyToMessageId);
    pendingQuestion.resolve(reply.text);

    return {
      chatId: pendingQuestion.chatId,
      outboundMessageId: pendingQuestion.outboundMessageId,
      requestId: pendingQuestion.requestId,
      text: reply.text,
    };
  }

  public rejectPendingQuestion(requestId: string, error: Error): void {
    const pendingQuestion = this.pendingByRequestId.get(requestId);

    if (pendingQuestion !== undefined) {
      this.pendingByRequestId.delete(requestId);
      pendingQuestion.reject(error);
      return;
    }

    const boundQuestion = this.findBoundQuestionByRequestId(requestId);

    if (boundQuestion === undefined) {
      return;
    }

    this.pendingByMessageId.delete(boundQuestion.outboundMessageId);
    boundQuestion.reject(error);
  }

  public rejectAll(error: Error): void {
    for (const pendingQuestion of this.pendingByRequestId.values()) {
      pendingQuestion.reject(error);
    }

    for (const pendingQuestion of this.pendingByMessageId.values()) {
      pendingQuestion.reject(error);
    }

    this.pendingByRequestId.clear();
    this.pendingByMessageId.clear();
  }

  public size(): number {
    return this.pendingByRequestId.size + this.pendingByMessageId.size;
  }
}
