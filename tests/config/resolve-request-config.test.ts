import { describe, expect, it } from "vitest";

import { ConfigError } from "../../src/errors/config-error.js";
import { resolveRequestConfig } from "../../src/config/resolve-request-config.js";

describe("resolveRequestConfig", () => {
  it("uses runtime defaults when no overrides are provided", () => {
    const resolved = resolveRequestConfig({
      runtime: {
        botToken: "runtime-token",
        defaultChatId: "runtime-chat",
      },
      headerConfig: {},
      transportKind: "stdio",
    });

    expect(resolved.botToken).toBe("runtime-token");
    expect(resolved.effectiveChatId).toBe("runtime-chat");
  });

  it("prefers header configuration over runtime configuration", () => {
    const resolved = resolveRequestConfig({
      runtime: {
        botToken: "runtime-token",
        defaultChatId: "runtime-chat",
      },
      headerConfig: {
        botToken: "header-token",
        defaultChatId: "header-chat",
      },
      transportKind: "http",
    });

    expect(resolved.botToken).toBe("header-token");
    expect(resolved.effectiveChatId).toBe("header-chat");
  });

  it("prefers tool chat id over header and runtime defaults", () => {
    const resolved = resolveRequestConfig({
      runtime: {
        botToken: "runtime-token",
        defaultChatId: "runtime-chat",
      },
      headerConfig: {
        defaultChatId: "header-chat",
      },
      toolChatId: "tool-chat",
      transportKind: "http",
    });

    expect(resolved.effectiveChatId).toBe("tool-chat");
  });

  it("throws when bot token is missing", () => {
    expect(() =>
      resolveRequestConfig({
        runtime: {},
        headerConfig: {},
        transportKind: "stdio",
      }),
    ).toThrow(ConfigError);
  });

  it("throws when effective chat id is missing", () => {
    expect(() =>
      resolveRequestConfig({
        runtime: {
          botToken: "runtime-token",
        },
        headerConfig: {},
        transportKind: "stdio",
      }),
    ).toThrow(ConfigError);
  });
});
