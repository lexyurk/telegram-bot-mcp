import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { ServerDependencies } from "../server/create-server.js";
import { createServer } from "../server/create-server.js";

export async function startStdioServer(
  dependencies: ServerDependencies,
): Promise<void> {
  const server = createServer(dependencies);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}
