export type ChatId = string;

export type TelegramMediaKind = "document" | "photo" | "video";

export type TelegramParseMode = "HTML" | "MarkdownV2";

export interface TelegramSendMessageResult {
  messageId: number;
  chatId: ChatId;
}

export interface PendingQuestionRecord {
  requestId: string;
  chatId: ChatId;
  createdAt: number;
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
}

export interface BoundPendingQuestion extends PendingQuestionRecord {
  outboundMessageId: number;
}

export interface PendingQuestionMatch {
  chatId: ChatId;
  outboundMessageId: number;
  requestId: string;
  text: string;
}

export interface IncomingReplyEnvelope {
  chatId: ChatId;
  replyToMessageId: number | undefined;
  text: string | undefined;
}

export interface AskUserRequest {
  chatId: ChatId;
  question: string;
  requestId: string;
  parseMode?: TelegramParseMode | undefined;
  timeoutMs?: number | undefined;
}

export interface TelegramSendMessageRequest {
  chatId: ChatId;
  text: string;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
  forceReply?: boolean | undefined;
}

export interface TelegramSendFileRequest {
  chatId: ChatId;
  filePath: string;
  caption?: string | undefined;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
}

export interface AskUserResponse extends TelegramSendMessageResult {
  answer: string;
  outboundMessageId: number;
}

export interface AskUserProgressHandlers {
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => Promise<void> | void;
}

export interface TelegramServiceLike {
  askUser: (
    request: AskUserRequest,
    options?: AskUserProgressHandlers,
  ) => Promise<AskUserResponse>;
  sendMessage: (
    request: TelegramSendMessageRequest,
  ) => Promise<TelegramSendMessageResult>;
  sendFile: (
    request: TelegramSendFileRequest,
  ) => Promise<TelegramSendMessageResult>;
  sendImage: (
    request: TelegramSendFileRequest,
  ) => Promise<TelegramSendMessageResult>;
  sendVideo: (
    request: TelegramSendFileRequest,
  ) => Promise<TelegramSendMessageResult>;
}
