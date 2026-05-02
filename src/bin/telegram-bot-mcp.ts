import "dotenv/config";

import { loadRuntimeConfig } from "../config/env.js";
import { createLogger } from "../logging/logger.js";
import { createServerDependencies } from "../server/create-server.js";
import { startHttpServer } from "../transports/http.js";
import { addShutdownHandler } from "../utils/shutdown.js";

async function main(): Promise<void> {
  const runtimeConfig = loadRuntimeConfig();
  const logger = createLogger(runtimeConfig.logLevel);
  const services = createServerDependencies({
    logger,
    runtimeConfig,
  });

  addShutdownHandler(async () => {
    await services.telegramServiceRegistry.shutdownAll();
  });

  await startHttpServer(services);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `telegram-bot-mcp fatal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
