import "dotenv/config";

import { loadRuntimeConfig } from "../config/env.js";
import { createLogger } from "../logging/logger.js";
import { createServerDependencies } from "../server/create-server.js";
import { startHttpServer } from "../transports/http.js";
import { startStdioServer } from "../transports/stdio.js";
import type { TransportMode } from "../types/config.js";
import { addShutdownHandler } from "../utils/shutdown.js";

function resolveTransport(envTransport: TransportMode): TransportMode {
  if (process.argv.includes("--http")) {
    return "http";
  }
  if (process.argv.includes("--stdio")) {
    return "stdio";
  }
  return envTransport;
}

async function main(): Promise<void> {
  const baseConfig = loadRuntimeConfig();
  const transport = resolveTransport(baseConfig.transport);
  const runtimeConfig = { ...baseConfig, transport };
  const logger = createLogger(runtimeConfig.logLevel);
  const services = createServerDependencies({
    logger,
    runtimeConfig,
  });

  addShutdownHandler(async () => {
    await services.telegramServiceRegistry.shutdownAll();
  });

  if (transport === "http") {
    await startHttpServer(services);
  } else {
    await startStdioServer(services);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `telegram-bot-mcp fatal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
