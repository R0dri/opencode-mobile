# AGENTS.md

## Overview

`opencode-mobile` - Single mobile push notification plugin for OpenCode. Enables push notifications via Expo for mobile devices with tunnel management (ngrok/cloudflare/localtunnel). Built with TypeScript and Bun runtime.

## Build, Lint, and Test Commands

```bash
# Run the plugin
bun run index.ts

# Type-check only (no emit)
npm run typecheck
npx tsc --noEmit

# Compile TypeScript
npx tsc

# Build (type-check + compile)
npm run build

# Testing with vitest
npx vitest run                    # Run all tests
npx vitest run src/tunnel/        # Run tunnel tests
npx vitest run src/tunnel/localtunnel.test.ts  # Run specific test file
npx vitest run --reporter=verbose # Verbose output
npx vitest ui                     # Interactive UI (http://localhost:51204/__vitest__)

# Version and release
npm version patch && npm run build && npm publish  # Patch release
```

## Project Structure

```
plugin/
├── index.ts              # Entry point (plugin + HTTP server)
├── src/
│   ├── tunnel/           # Tunnel providers (ngrok, cloudflare, localtunnel)
│   │   ├── index.ts      # Unified interface, orchestrator
│   │   ├── localtunnel.ts# Localtunnel provider (62 lines, testable)
│   │   ├── cloudflare.ts # Cloudflare tunnel (117 lines, testable)
│   │   ├── ngrok.ts      # Ngrok with 4-strategy fallback (480 lines)
│   │   ├── qrcode.ts     # QR code utilities
│   │   ├── types.ts      # Type definitions
│   │   ├── *.test.ts     # Unit tests (vitest)
│   │   └── vitest.config.ts
│   ├── push/             # Push notification logic
│   │   ├── index.ts      # Barrel export
│   │   ├── types.ts      # Push types
│   │   ├── token-store.ts# Token persistence
│   │   ├── formatter.ts  # Notification formatting
│   │   ├── sender.ts     # Expo API sender
│   │   └── notification-handler.ts  # Session notification (commented)
│   └── proxy/            # Reverse proxy utilities
├── vitest.config.ts      # Test configuration
├── tsconfig.json         # TypeScript config (strict mode, bundler)
└── package.json          # Dependencies + scripts
```

## Code Style Guidelines

### Imports

```typescript
// Standard library - namespace imports
import * as fs from "fs";
import * as path from "path";

// External modules - named or default imports
import ngrok from "@ngrok/ngrok";
import qrcode from "qrcode";

// Types - use import type when only using types
import type { Plugin } from "@opencode-ai/plugin";
import type { TunnelConfig } from "./types";

// Group imports logically: types → external modules → internal modules
import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";
import { startTunnel } from "./src/tunnel";
```

### Formatting

- **2 spaces** for indentation
- **Single quotes** for strings
ons** at end- **Semicol of statements
- **Trailing commas** in multi-line objects/arrays
- **Max line length**: ~100 characters (soft limit)

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

// Explicit return types for public functions
function loadTokens(): PushToken[] {
  // ...
}

// Avoid `any` - use `unknown` with type guards when uncertain
function safeParse(data: unknown): Record<string, unknown> {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data as Record<string, unknown>;
}
```

### Naming Conventions

| Pattern | Convention | Example |
|---------|------------|---------|
| Constants | UPPER_SNAKE_CASE | `TOKEN_FILE`, `BUN_SERVER_PORT` |
| Functions/variables | camelCase | `loadTokens`, `startTunnel` |
| Interfaces/classes | PascalCase | `PushToken`, `TunnelConfig` |
| Private/internal | prefix `_` | `_bunServer`, `_pluginInitialized` |
| Booleans | prefix `is`, `has`, `should` | `isRunning`, `hasStarted` |

### Error Handling

```typescript
// Always wrap async operations in try-catch
try {
  await someAsyncOperation();
} catch (error: unknown) {
  // Log errors with module prefix
  console.error("[ModuleName] Error message:", error.message);
  
  // Provide context in error messages
  if (error.message?.includes("specific case")) {
    console.error("[PushPlugin] Handle specific error:", error.message);
  } else {
    console.error("[PushPlugin] Unexpected error:", error.message);
  }
}

// Handle specific error types when possible
if (error instanceof ValidationError) {
  // Handle validation errors
}
```

### Console Logging

- Use **module prefixes** in all console output: `[PushPlugin]`, `[Tunnel]`, `[Proxy]`
- Use **emojis** for status indicators: `✅`, `❌`, `💡`, `ℹ️`
- Log important steps and results

```typescript
console.log('[PushPlugin] Starting...');
console.error('[PushPlugin] Failed:', error.message);
console.log(`[Tunnel] URL: ${url}`);
console.log('✅ Server started successfully');
console.log('❌ Connection failed:', error.message);
```

### Async/Await

```typescript
// Use async/await over raw promises
async function startServer(): Promise<void> {
  try {
    await startProxy();
    await startTunnel();
  } catch (error) {
    // handle error
  }
}

// Never leave promises unhandled
// Use Promise.all() for parallel operations
const [result1, result2] = await Promise.all([
  operation1(),
  operation2(),
]);
```

## Test Patterns (Vitest)

### Test File Naming

- `*.test.ts` - Unit tests for modules
- Located alongside the module being tested (e.g., `localtunnel.ts` → `localtunnel.test.ts`)

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("module name", () => {
  beforeEach(async () => {
    // Setup before each test
    const { clearState } = await import("./module");
    clearState();
  });

  afterEach(async () => {
    // Cleanup after each test
    const { cleanup } = await import("./module");
    await cleanup().catch(() => {});
  });

  describe("functionality group", () => {
    it("should do something", async () => {
      const { functionName } = await import("./module");
      const result = await functionName();
      expect(result).toHaveProperty("expected");
    });

    it("should throw on invalid input", async () => {
      const { functionName } = await import("./module");
      await expect(functionName(invalidInput)).rejects.toThrow("error message");
    });
  });
});
```

### Test Helpers for Tunnel Modules

Tunnel providers expose test helpers for isolation:

```typescript
// State management helpers
clearInstance();    // Reset module state
setInstance(mock);  // Set mock instance
getInstance();      // Get current instance

// Factory functions with DI
createLocaltunnel(config, { localtunnelModule: mockModule });
createCloudflareTunnel(config, mockSpawn, mockExistsSync, onUrl);
```

## Plugin Interface

All plugins must export a function matching the `Plugin` type from `@opencode-ai/plugin`:

```typescript
import type { Plugin } from "@opencode-ai/plugin";

export const PushNotificationPlugin: Plugin = async (ctx) => {
  // Initialize plugin
  return {
    event: async ({ event }) => {
      // Handle event
    },
  };
};

export default PushNotificationPlugin;
```

## Signal Handling

```typescript
// Handle process signals for graceful shutdown
const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    await gracefulShutdown();
    process.exit(0);
  });
});
```

## Key Patterns

1. **Single Entry Point**: `index.ts` is the only entry point (tsconfig includes only this file)
2. **Plugin Pattern**: Export a `Plugin` function returning an event handler
3. **Factory Functions**: Tunnel providers use `create*` functions for testability with dependency injection
4. **State Helpers**: Export `getInstance()`, `setInstance()`, `clearInstance()` for testing
5. **Graceful Shutdown**: Listen for SIGINT/SIGTERM/SIGHUP
6. **Bun Server**: Use `Bun.serve()` for HTTP servers
7. **Tunnel Providers**: Support ngrok, cloudflare, localtunnel with fallback
8. **Ngrok Multi-Strategy**: 4 fallback strategies if one fails

## Configuration

### TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["index.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Vitest (vitest.config.ts)

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

## Runtime

- **Runtime**: Bun (not Node.js)
- **TypeScript**: Strict mode enabled
- **No ESLint/Prettier**: Follow existing patterns manually
- **Testing**: Vitest with globals plugin

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@opencode-ai/plugin` | Core plugin interface |
| `@ngrok/ngrok` | Ngrok SDK |
| `localtunnel` | Localtunnel provider |
| `qrcode` | QR code generation |
| `cloudflared` | Cloudflare tunnel binary |

## Important Notes

- **tsconfig.json** includes only `index.ts` - TypeScript follows imports automatically
- Old test files (`test-tunnel.ts`, `test-utils.ts`, `test-tunnel.ts`) should be deleted if found
- Test files use `.test.ts` suffix and live alongside the module they test
- Use `npx vitest run` for CI, `npx vitest ui` for development
