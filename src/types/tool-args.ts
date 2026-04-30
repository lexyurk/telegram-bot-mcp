export interface ChatTargetArgs {
  chatId?: string | undefined;
}

export interface AskUserArgs extends ChatTargetArgs {
  question: string;
}

export interface NotifyUserArgs extends ChatTargetArgs {
  message: string;
}

export interface SendFileArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
}

export interface SendImageArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
}

export interface SendVideoArgs extends ChatTargetArgs {
  filePath: string;
  caption?: string | undefined;
}
