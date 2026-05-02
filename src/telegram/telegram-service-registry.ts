import type { AppLogger } from "../logging/logger.js";
import { TelegramService } from "./telegram-service.js";

export class TelegramServiceRegistry {
  private readonly services = new Map<string, TelegramService>();

  public constructor(private readonly logger: AppLogger) {}

  public getService(botToken: string): TelegramService {
    const existingService = this.services.get(botToken);

    if (existingService) {
      return existingService;
    }

    const service = new TelegramService(botToken, this.logger);
    this.services.set(botToken, service);

    this.logger.debug(
      { event: "telegram.service.created", tokenFingerprint: botToken.slice(-6) },
      "Created Telegram service",
    );

    return service;
  }

  public async shutdownAll(): Promise<void> {
    await Promise.all(
      Array.from(this.services.values(), async (service) => {
        await service.shutdown();
      }),
    );
  }
}
