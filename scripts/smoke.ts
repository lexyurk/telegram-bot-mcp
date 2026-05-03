// End-to-end smoke test: drives a running telegram-bot-mcp HTTP server through
// every tool against a real Telegram bot. Run after starting the server in a
// separate terminal, e.g.:
//
//   TELEGRAM_BOT_MCP_PORT=3000 npm run dev
//
// Then in this terminal:
//
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_DEFAULT_CHAT_ID=... npm run smoke
//
// Optional env:
//   SMOKE_URL              — MCP endpoint URL (default http://127.0.0.1:3000/mcp)
//   SMOKE_IMAGE_PATH       — absolute path to a real image to upload
//   SMOKE_FILE_PATH        — absolute path to any file to upload as document
//   SMOKE_VIDEO_PATH       — absolute path to a real video to upload
//   SMOKE_REPLY            — set to 1 to wait 60s for you to actually reply to ask_user
//                            (otherwise ask_user is exercised via short timeoutSeconds)

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const SERVER_URL = process.env.SMOKE_URL ?? "http://127.0.0.1:3000/mcp";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim();
const IMAGE_PATH = process.env.SMOKE_IMAGE_PATH?.trim();
const FILE_PATH = process.env.SMOKE_FILE_PATH?.trim();
const VIDEO_PATH = process.env.SMOKE_VIDEO_PATH?.trim();
const WAIT_FOR_REPLY = process.env.SMOKE_REPLY === "1";

if (!BOT_TOKEN || !CHAT_ID) {
  console.error(
    "ERROR: TELEGRAM_BOT_TOKEN and TELEGRAM_DEFAULT_CHAT_ID must be set.",
  );
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), {
  requestInit: {
    headers: {
      "x-telegram-bot-token": BOT_TOKEN,
      "x-telegram-default-chat-id": CHAT_ID,
    },
  },
});

const client = new Client({ name: "telegram-bot-mcp-smoke", version: "0.0.0" });

let pass = 0;
let fail = 0;
const failures: string[] = [];

function isError(result: CallToolResult): boolean {
  return result.isError === true;
}

function summarize(result: CallToolResult): string {
  const first = result.content?.[0];
  if (!first) return "(no content)";
  if (first.type === "text") return first.text.slice(0, 120);
  return `(${first.type})`;
}

async function step(
  label: string,
  fn: () => Promise<CallToolResult>,
  expect: "ok" | "error" = "ok",
): Promise<void> {
  process.stdout.write(`▶ ${label.padEnd(50, " ")}`);
  try {
    const r = await fn();
    const errored = isError(r);
    const ok = expect === "ok" ? !errored : errored;
    if (ok) {
      pass += 1;
      console.log(`  PASS  ${summarize(r)}`);
    } else {
      fail += 1;
      failures.push(label);
      console.log(`  FAIL  expected=${expect}  errored=${errored}`);
      console.log(`        body: ${summarize(r)}`);
    }
  } catch (err) {
    fail += 1;
    failures.push(label);
    console.log(
      `  FAIL  threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function main(): Promise<void> {
  console.log(`Connecting to ${SERVER_URL}...`);
  await client.connect(transport as never);

  const list = await client.listTools();
  console.log(`Server exposes: ${list.tools.map((t) => t.name).join(", ")}\n`);

  await step("notify_user — plain", () =>
    client.callTool({
      name: "notify_user",
      arguments: { message: "[smoke] plain notification" },
    }) as Promise<CallToolResult>,
  );

  await step("notify_user — HTML formatting", () =>
    client.callTool({
      name: "notify_user",
      arguments: {
        message: "[smoke] <b>bold</b> + <i>italic</i> + <code>mono</code>",
        parseMode: "HTML",
      },
    }) as Promise<CallToolResult>,
  );

  await step("notify_user — silent", () =>
    client.callTool({
      name: "notify_user",
      arguments: { message: "[smoke] silent (no sound)", silent: true },
    }) as Promise<CallToolResult>,
  );

  await step("notify_user — chatId override", () =>
    client.callTool({
      name: "notify_user",
      arguments: {
        message: "[smoke] sent via chatId override (same chat)",
        chatId: CHAT_ID,
      },
    }) as Promise<CallToolResult>,
  );

  if (IMAGE_PATH) {
    await step("send_image — caption + HTML", () =>
      client.callTool({
        name: "send_image",
        arguments: {
          filePath: IMAGE_PATH,
          caption: "[smoke] <b>image caption</b>",
          parseMode: "HTML",
        },
      }) as Promise<CallToolResult>,
    );
  } else {
    console.log("⏭  send_image — skipped (set SMOKE_IMAGE_PATH to test)");
  }

  if (FILE_PATH) {
    await step("send_file", () =>
      client.callTool({
        name: "send_file",
        arguments: { filePath: FILE_PATH, caption: "[smoke] document" },
      }) as Promise<CallToolResult>,
    );
  } else {
    console.log("⏭  send_file — skipped (set SMOKE_FILE_PATH to test)");
  }

  if (VIDEO_PATH) {
    await step("send_video", () =>
      client.callTool({
        name: "send_video",
        arguments: { filePath: VIDEO_PATH, caption: "[smoke] video" },
      }) as Promise<CallToolResult>,
    );
  } else {
    console.log("⏭  send_video — skipped (set SMOKE_VIDEO_PATH to test)");
  }

  if (WAIT_FOR_REPLY) {
    console.log(
      "▶ ask_user (60s) — REPLY to the bot's message in Telegram now...",
    );
    await step(
      "ask_user — real reply roundtrip",
      () =>
        client.callTool({
          name: "ask_user",
          arguments: {
            question: "[smoke] reply to me with anything",
            timeoutSeconds: 60,
          },
        }) as Promise<CallToolResult>,
      "ok",
    );
  } else {
    await step(
      "ask_user — timeout fires after 5s (do NOT reply)",
      () =>
        client.callTool({
          name: "ask_user",
          arguments: {
            question: "[smoke] this will time out in 5s, ignore it",
            timeoutSeconds: 5,
          },
        }) as Promise<CallToolResult>,
      "error",
    );
  }

  await client.close();

  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (failures.length > 0) {
    console.log("Failed steps:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Smoke harness crashed:", err);
  process.exitCode = 1;
});
