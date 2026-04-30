const shutdownHandlers = new Set<() => void | Promise<void>>();
let registered = false;

async function runHandlers(): Promise<void> {
  for (const handler of shutdownHandlers) {
    await handler();
  }
}

function registerSignals(): void {
  if (registered) {
    return;
  }

  registered = true;

  const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
    try {
      await runHandlers();
    } finally {
      process.exit(signal === "SIGINT" ? 130 : 0);
    }
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
}

export function addShutdownHandler(handler: () => void | Promise<void>): void {
  registerSignals();
  shutdownHandlers.add(handler);
}

