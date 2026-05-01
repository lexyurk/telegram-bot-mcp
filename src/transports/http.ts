import { randomUUID } from "node:crypto";
import type { Server } from "node:http";

import express from "express";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { addShutdownHandler } from "../utils/shutdown.js";
import type { ServerDependencies } from "../server/create-server.js";
import { createServer } from "../server/create-server.js";

export interface HttpTransportServices extends ServerDependencies {}

interface TransportSession {
  server: ReturnType<typeof createServer>;
  transport: StreamableHTTPServerTransport;
}

function getSessionId(request: Request): string | undefined {
  const sessionIdHeader = request.headers["mcp-session-id"];
  return Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
}

async function listen(app: express.Express, port: number): Promise<Server> {
  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

export async function startHttpServer(
  services: HttpTransportServices,
): Promise<void> {
  const app = createMcpExpressApp();
  const transports = new Map<string, TransportSession>();

  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = getSessionId(req);
      const existingSession = sessionId ? transports.get(sessionId) : undefined;
      let transport = existingSession?.transport;

      if (transport === undefined) {
        if (!isInitializeRequest(req.body)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Bad Request: No valid session ID provided",
            },
            id: null,
          });
          return;
        }

        const server = createServer(services);

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized(newSessionId) {
            transports.set(newSessionId, {
              server,
              transport: transport!,
            });
          },
        });

        await server.connect(transport as never);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      services.logger.error({ error }, "Failed to handle HTTP MCP request");

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const session = transports.get(sessionId);

    if (!session) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    try {
      await session.transport.handleRequest(req, res);
    } catch (error: unknown) {
      services.logger.error({ error, sessionId }, "Failed to handle HTTP SSE request");

      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const session = transports.get(sessionId);

    if (!session) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    try {
      await session.transport.handleRequest(req, res);
      transports.delete(sessionId);
      await session.server.close();
    } catch (error: unknown) {
      services.logger.error(
        { error, sessionId },
        "Failed to handle HTTP session termination request",
      );

      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  const server = await listen(app, services.runtimeConfig.port);

  services.logger.info(
    { port: services.runtimeConfig.port },
    "Telegram bot MCP HTTP server listening",
  );

  addShutdownHandler(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await Promise.all(
      Array.from(transports.values(), async ({ server: sessionServer, transport }) => {
        await transport.close();
        await sessionServer.close();
      }),
    );
  });
}
