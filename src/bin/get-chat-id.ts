import "dotenv/config";

import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (token === undefined || token.length === 0) {
  console.error(
    "TELEGRAM_BOT_TOKEN is required. Set it in the environment before running telegram-bot-mcp-chat-id.",
  );
  process.exit(1);
}

const bot = new Bot(token);

console.error("Send any message to your bot to print the chat ID.");

bot.on("message", async (context) => {
  console.log(`${context.chat.id}`);
  await bot.stop();
  process.exit(0);
});

bot.catch((error) => {
  console.error("Failed to read Telegram updates:", error.error);
});

bot
  .start({
    onStart() {
      console.error("Waiting for a Telegram message...");
    },
  })
  .catch((error) => {
    console.error("Unable to start Telegram polling:", error);
    process.exit(1);
  });
