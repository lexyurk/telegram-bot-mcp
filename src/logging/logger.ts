import pino from "pino";

import type { LogLevel } from "../types/config.js";

export type AppLogger = pino.Logger;

export function createLogger(level: LogLevel): AppLogger {
  return pino(
    {
      level,
      name: "telegram-bot-mcp",
      base: null,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    },
    pino.destination({
      dest: 2,
      sync: false,
    }),
  );
}
