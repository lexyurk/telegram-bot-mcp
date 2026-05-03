import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { ServerDependencies } from "../server/create-server.js";
import { createServer } from "../server/create-server.js";
import { addShutdownHandler } from "../utils/shutdown.js";

export async function startStdioServer(
  services: ServerDependencies,
): Promise<void> {
  const server = createServer(services);
  const transport = new StdioServerTransport();

  await server.connect(transport as never);

  services.logger.info("Telegram bot MCP stdio server ready");

  addShutdownHandler(async () => {
    await transport.close();
    await server.close();
  });
}
