# telegram-bot-mcp

A Model Context Protocol (MCP) server that lets agents send Telegram messages, files, and questions through a bot of your choice. Useful when you want an agent to ping you, ask you something, or hand you a file via Telegram.

## Tools

| Tool | What it does |
|---|---|
| `notify_user` | Send a one-way notification message |
| `ask_user` | Send a question and wait for the user to reply |
| `send_file` | Upload any file as a Telegram document |
| `send_image` | Upload an image (rendered inline) |
| `send_video` | Upload a video (rendered inline) |

All tools accept `parseMode` (`HTML` / `MarkdownV2`), an optional `chatId` override, and `silent` (where applicable). `ask_user` accepts `timeoutSeconds`.

## Prerequisites

1. **Create a Telegram bot** via [@BotFather](https://t.me/BotFather) — you'll get a token like `123456789:ABCdef...`.
2. **Get your chat ID**. Send any message to your bot, then run:
   ```bash
   TELEGRAM_BOT_TOKEN=YOUR_TOKEN \
     npx -p @lexyurk/telegram-bot-mcp telegram-bot-mcp-chat-id
   ```
   It prints the chat ID and exits. Personal chats have positive IDs; groups have negative IDs (the bot needs to be a member).

## Install (stdio — recommended for local MCP clients)

This is the "just works" path for [Claude Code](https://docs.claude.com/claude-code), [Cursor Desktop](https://cursor.sh), [Claude Desktop](https://claude.ai/download), and Codex CLI. Your MCP client spawns the process via `npx`; secrets stay in env vars on your machine.

### Claude Code

```bash
claude mcp add telegram-bot \
  -e TELEGRAM_BOT_TOKEN=123456789:your-bot-token \
  -e TELEGRAM_DEFAULT_CHAT_ID=123456789 \
  -- npx -y @lexyurk/telegram-bot-mcp
```

Restart your Claude Code session and the five tools appear.

### Cursor Desktop / Claude Desktop / Codex CLI

Add to your client's MCP config JSON:

```json
{
  "mcpServers": {
    "telegram-bot": {
      "command": "npx",
      "args": ["-y", "@lexyurk/telegram-bot-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "123456789:your-bot-token",
        "TELEGRAM_DEFAULT_CHAT_ID": "123456789"
      }
    }
  }
}
```

## Install (HTTP — for Cursor Cloud, claude.ai, hosted agents)

Cloud-hosted MCP clients can't spawn local processes — they connect to a URL. You self-host the server (Railway / Fly / Render / your VPS) and point your client at the public HTTPS URL.

### Run the server

```bash
TELEGRAM_BOT_TOKEN=123456789:your-bot-token \
TELEGRAM_DEFAULT_CHAT_ID=123456789 \
TELEGRAM_BOT_MCP_PORT=3000 \
npx @lexyurk/telegram-bot-mcp --http
```

(`--http` is required to switch out of the default stdio mode. You can also set `TELEGRAM_BOT_MCP_TRANSPORT=http`.)

### Connect a client

```json
{
  "mcpServers": {
    "telegram-bot": {
      "type": "streamable-http",
      "url": "https://your-host.example.com/mcp"
    }
  }
}
```

For multi-tenant setups (one server, many users with their own bots), supply per-request headers instead of env vars:

```http
x-telegram-bot-token: 123456789:your-bot-token
x-telegram-default-chat-id: 123456789
```

Aliases also accepted: `telegram-bot-token`, `telegram-chat-id`.

## Configuration reference

| Env var | Default | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | — | Required for stdio. Optional for HTTP if every request supplies a header. |
| `TELEGRAM_DEFAULT_CHAT_ID` | — | Used when a tool call doesn't specify `chatId`. |
| `TELEGRAM_BOT_MCP_TRANSPORT` | `stdio` | `stdio` or `http`. |
| `TELEGRAM_BOT_MCP_PORT` | `3000` | Only used in HTTP mode. |
| `TELEGRAM_BOT_MCP_LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Logs always go to stderr. |

CLI flags: `--stdio` and `--http` override `TELEGRAM_BOT_MCP_TRANSPORT`.

### Resolution precedence

**Bot token:** request header → `TELEGRAM_BOT_TOKEN` → error.

**Chat ID:** tool argument `chatId` → request header → `TELEGRAM_DEFAULT_CHAT_ID` → error.

## Tool examples

```json
// notify_user
{ "message": "Build finished ✅", "parseMode": "HTML", "silent": true }

// ask_user — times out after 5 minutes if no reply
{ "question": "Approve deploy?", "timeoutSeconds": 300 }

// send_image
{ "filePath": "/abs/path/to/screenshot.png", "caption": "<b>Latest</b>", "parseMode": "HTML" }
```

## Notes and limitations

- **Reply matching for `ask_user`** uses Telegram's `reply_to_message.message_id`. In private chats Telegram auto-pops the reply UI; in groups the user must explicitly long-press the bot's message → Reply.
- **Telegram allows only one polling consumer per bot token at a time.** Polling starts lazily on the first `ask_user` call. If you use the same bot in multiple stdio MCP clients simultaneously, only the first one to call `ask_user` will receive replies. Notification-only setups never poll and have no conflict.
- **Pending `ask_user` calls live in memory.** If the process restarts, in-flight waits are lost (the MCP client will get a connection error and can retry).
- **429 rate limits** are auto-retried once, honoring Telegram's `retry_after`.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build

# stdio mode
node dist/bin/telegram-bot-mcp.js

# http mode
TELEGRAM_BOT_MCP_PORT=3000 node dist/bin/telegram-bot-mcp.js --http

# end-to-end smoke (requires a real bot, see scripts/smoke.ts)
TELEGRAM_BOT_TOKEN=... TELEGRAM_DEFAULT_CHAT_ID=... npm run smoke
```

## License

MIT
