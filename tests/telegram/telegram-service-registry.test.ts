import { describe, expect, it } from "vitest";

import { createLogger } from "../../src/logging/logger.js";
import { TelegramServiceRegistry } from "../../src/telegram/telegram-service-registry.js";

describe("TelegramServiceRegistry", () => {
  it("reuses the same service for the same token", () => {
    const registry = new TelegramServiceRegistry(createLogger("info"));

    const first = registry.getService("token-1");
    const second = registry.getService("token-1");

    expect(first).toBe(second);
  });

  it("creates separate services for different tokens", () => {
    const registry = new TelegramServiceRegistry(createLogger("info"));

    const first = registry.getService("token-1");
    const second = registry.getService("token-2");

    expect(first).not.toBe(second);
  });
});
