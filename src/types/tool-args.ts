import type { TelegramParseMode } from "./telegram.js";

export interface ChatTargetArgs {
  chatId?: string | undefined;
}

export interface AskUserArgs extends ChatTargetArgs {
  question: string;
  parseMode?: TelegramParseMode | undefined;
  timeoutSeconds?: number | undefined;
}

export interface NotifyUserArgs extends ChatTargetArgs {
  message: string;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
}

export interface SendFileArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
}

export interface SendImageArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
}

export interface SendVideoArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
  parseMode?: TelegramParseMode | undefined;
  silent?: boolean | undefined;
}
