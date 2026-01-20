# AGENTS.md

## Overview

`opencode-mobile` - Single mobile push notification plugin for OpenCode. Enables push notifications via Expo for mobile devices with tunnel management (ngrok/cloudflare/localtunnel). Built with TypeScript and Bun runtime.

## Build, Lint, and Test Commands

```bash
bun run index.ts                    # Run the plugin
npx tsc --noEmit                    # Type-check only
npx tsc                             # Compile TypeScript
npm run build                       # Build (type-check + compile)
npx eslint "**/*.ts" --fix          # Linting (follow existing patterns)
bun test                            # Tests (not configured)
bun test <file>.test.ts             # Run specific test
bun test --test-name-pattern="name" # Run by pattern
```

## Project Structure (Single Plugin)

```
plugin/
├── index.ts              # Single entry point (barrel export)
├── push-notifications.ts # Main plugin logic
├── sdk-logger.ts         # Custom logger
├── tsconfig.json         # TypeScript config (strict mode)
└── src/                  # Modular source code
    ├── tunnel/           # Tunnel providers
    │   ├── index.ts      # Unified interface
    │   ├── ngrok.ts      # Ngrok with multi-strategy fallback
    │   ├── cloudflare.ts # Cloudflare tunnel
    │   ├── localtunnel.ts# Localtunnel
    │   ├── qrcode.ts     # QR code utilities
    │   └── types.ts      # Type definitions
    ├── push/             # Push notification logic
    │   ├── index.ts
    │   ├── types.ts
    │   ├── token-store.ts
    │   ├── formatter.ts
    │   └── sender.ts
    ├── proxy/            # Proxy utilities
    └── utils/            # Shared utilities
```

## Code Style Guidelines

### Imports

```typescript
import * as fs from "fs";
import * as path from "path";
import ngrok from "@ngrok/ngrok";
import qrcode from "qrcode";
import type { Plugin } from "@opencode-ai/plugin";
import { startTunnel } from "./src/tunnel";
```

### Formatting

- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** at end of statements
- **Trailing commas** in multi-line objects/arrays

### Types

```typescript
// Interfaces for object shapes
interface PushToken {
  token: string;
  platform: "ios" | "android";
  deviceId: string;
  registeredAt: string;
}

// Type aliases for unions/primitives
type NotificationHandler = (notification: Notification) => Promise<void>;

// Explicit return types, avoid `any`
function loadTokens(): PushToken[] { /* ... */ }
function safeParse(data: unknown): Record<string, unknown> {
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return data as Record<string, unknown>;
}
```

### Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Constants | UPPER_SNAKE_CASE | `TOKEN_FILE` |
| Functions/variables | camelCase | `loadTokens` |
| Interfaces/classes | PascalCase | `PushToken` |
| Private/internal | prefix `_` | `_bunServer` |
| Booleans | prefix `is`/`has`/`should` | `isRunning` |

### Error Handling

```typescript
try {
  await someAsyncOperation();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[ModuleName] Error:", message);
}

if (error instanceof ValidationError) { /* handle */ }
```

### Console Logging

- Use **module prefixes**: `[PushPlugin]`, `[Tunnel]`, `[Proxy]`
- Use **emojis**: `✅`, `❌`, `💡`, `ℹ️`
- Custom logger: `logger.info()`, `logger.error()`

```typescript
console.log("[PushPlugin] Starting...");
console.error("[PushPlugin] Failed:", error.message);
```

### Async/Await

```typescript
async function startServer(): Promise<void> {
  await startProxy();
  await startTunnel();
}

const [result1, result2] = await Promise.all([operation1(), operation2()]);
```

## Plugin Interface

```typescript
import type { Plugin } from "@opencode-ai/plugin";

export const PushNotificationPlugin: Plugin = async (ctx) => {
  return {
    event: async ({ event }) => { /* handle event */ },
  };
};

export default PushNotificationPlugin;
```

## Key Patterns

1. **Single Entry Point**: `index.ts` exports the main plugin
2. **Plugin Pattern**: Export a `Plugin` function returning an event handler
3. **Graceful Shutdown**: Listen for SIGINT/SIGTERM/SIGHUP
4. **Bun Server**: Use `Bun.serve()` for HTTP servers
5. **Tunnel Providers**: Support ngrok, cloudflare, localtunnel with fallback
6. **Ngrok Multi-Strategy**: 4 fallback strategies if one fails

## Additional Notes

- **Runtime**: Bun (not Node.js)
- **TypeScript**: Strict mode enabled
- **No ESLint/Prettier**: Follow existing patterns manually
- **Dependencies**: @opencode-ai/plugin, @ngrok/ngrok, qrcode, cloudflared, localtunnel
