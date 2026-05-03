# telegram-bot-mcp

TypeScript MCP server for communicating with Telegram users through a bot.

It supports:

- asking a user a question and waiting indefinitely for a reply
- sending notifications that do not require a response
- sending generic files
- sending images
- sending videos
- reply-based response tracking using Telegram message replies
- secure chat ID validation
- structured stderr-only logging
- default chat ID configuration plus per-request `chatId` override
- HTTP transport with header-based bot token / default chat ID configuration

## Features

### Tools

- `ask_user`
- `notify_user`
- `send_file`
- `send_image`
- `send_video`

Every tool accepts an optional `chatId`. When provided, it overrides the default chat ID from headers or environment configuration.

### Transport modes

This package is designed for **HTTP MCP transport** so Telegram configuration can be provided through request headers.

> Important: this server is header-driven. Use HTTP transport mode.

## Installation

### Run with npx

```bash
npx @lexyurk/telegram-bot-mcp
```

### Local development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Configuration

### Environment variables

The server reads these variables:

```bash
TELEGRAM_BOT_TOKEN=123456789:your-bot-token
TELEGRAM_DEFAULT_CHAT_ID=123456789
TELEGRAM_BOT_MCP_PORT=3000
TELEGRAM_BOT_MCP_LOG_LEVEL=info
```

### HTTP headers

When using HTTP transport, the server also supports:

- `x-telegram-bot-token`
- `x-telegram-default-chat-id`

Aliases also accepted:

- `telegram-bot-token`
- `telegram-chat-id`

### Resolution precedence

#### Bot token

1. HTTP header bot token
2. `TELEGRAM_BOT_TOKEN`
3. error

#### Effective chat ID

1. tool argument `chatId`
2. HTTP header default chat ID
3. `TELEGRAM_DEFAULT_CHAT_ID`
4. error

## Usage

### Start the server

```bash
TELEGRAM_BOT_MCP_PORT=3000 \
npx @lexyurk/telegram-bot-mcp
```
Example MCP client configuration:

```json
{
  "mcpServers": {
    "telegram-bot-mcp": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "x-telegram-bot-token": "123456789:your-bot-token",
        "x-telegram-default-chat-id": "123456789"
      }
    }
  }
}
```


Then provide headers on requests:

```http
x-telegram-bot-token: 123456789:your-bot-token
x-telegram-default-chat-id: 123456789
```

## Tool schemas

### `ask_user`

```json
{
  "question": "Do you approve this deployment?",
  "chatId": "123456789"
}
```

### `notify_user`

```json
{
  "message": "Build completed successfully.",
  "chatId": "123456789"
}
```

### `send_file`

```json
{
  "filePath": "/absolute/path/to/report.pdf",
  "caption": "Deployment report",
  "chatId": "123456789"
}
```

### `send_image`

```json
{
  "filePath": "/absolute/path/to/screenshot.png",
  "caption": "Latest screenshot",
  "chatId": "123456789"
}
```

### `send_video`

```json
{
  "filePath": "/absolute/path/to/demo.mp4",
  "caption": "Demo recording",
  "chatId": "123456789"
}
```

## Chat ID helper

You can print your Telegram chat ID with:

```bash
TELEGRAM_BOT_TOKEN=123456789:your-bot-token \
npx -p @lexyurk/telegram-bot-mcp telegram-bot-mcp-chat-id
```

Then send any message to your bot. The tool prints the chat ID and exits.

## Notes and limitations

- `ask_user` waits indefinitely for a reply.
- Pending replies are stored **in memory**.
- If the process restarts, pending waits are lost.
- Reply matching is based on Telegram `reply_to_message.message_id` and chat ID validation.
- The server keeps logs on **stderr**.
- Telegram polling is started lazily when `ask_user` is used.
- Only one polling consumer should use the same bot token at a time.

## Scripts

```bash
npm run typecheck
npm test
npm run build
```

## License

MIT