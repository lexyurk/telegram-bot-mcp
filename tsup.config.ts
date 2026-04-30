import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "server/index": "src/server/index.ts",
    },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    shims: false,
  },
  {
    entry: {
      "bin/telegram-bot-mcp": "src/bin/telegram-bot-mcp.ts",
      "bin/get-chat-id": "src/bin/get-chat-id.ts",
    },
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    splitting: false,
    sourcemap: true,
    clean: false,
    dts: true,
    shims: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
