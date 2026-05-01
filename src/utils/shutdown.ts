const shutdownHandlers = new Set<() => void | Promise<void>>();
let registered = false;

async function runHandlers(): Promise<void> {
  const errors: unknown[] = [];

  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error: unknown) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error("Shutdown handler failed:", error);
    }
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

