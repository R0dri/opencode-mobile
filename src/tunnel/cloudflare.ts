/**
 * Cloudflare tunnel provider implementation
 * 
 * Refactored for testability:
 * - Optional spawn function for dependency injection
 * - Optional fs.existsSync for testing
 * - Port validation
 * - Clean separation of concerns
 */

import { spawn, ChildProcess } from "child_process";
import type { TunnelConfig, TunnelInfo } from "./types";

// Export types for external use
export type { TunnelConfig, TunnelInfo };

// Module-level state (for backward compatibility)
let _process: ChildProcess | null = null;
let _url: string | null = null;

// Default paths for cloudflared
const CLOUDFLARED_PATHS = [
  "/usr/local/bin/cloudflared",
  "/usr/bin/cloudflared",
  `${process.env.HOME || ""}/.cloudflared/cloudflared`,
  "/opt/homebrew/bin/cloudflared",
];

/**
 * Find cloudflared binary (extracted for testability)
 */
export function findCloudflared(
  paths?: string[],
  existsSync?: (path: string) => boolean
): string | null {
  const searchPaths = paths || CLOUDFLARED_PATHS;
  const checkExists = existsSync || ((p: string) => require("fs").existsSync(p));
  
  for (const p of searchPaths) {
    try {
      if (checkExists(p)) return p;
    } catch {}
  }
  return null;
}

/**
 * Create a cloudflare tunnel instance
 * This function is testable - accepts external spawn and existsSync
 */
export function createCloudflareTunnel(
  config: TunnelConfig,
  spawnFn?: typeof spawn,
  existsSyncFn?: (path: string) => boolean,
  onUrl?: (url: string) => void
): Promise<TunnelInfo> {
  // Validate port
  if (!config.port || typeof config.port !== "number") {
    return Promise.reject(new Error("Invalid port: must be a number"));
  }

  // Find cloudflared
  const cloudflaredPath = findCloudflareD(CLOUDFLARED_PATHS, existsSyncFn);
  if (!cloudflaredPath) {
    return Promise.reject(
      new Error("cloudflared not found. Install from https://github.com/cloudflare/cloudflared")
    );
  }

  const spawnModule = spawnFn || spawn;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for cloudflared URL (60s)")),
      60000
    );

    const process = spawnModule(cloudflaredPath, [
      "tunnel",
      "--url",
      `http://127.0.0.1:${config.port}`,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    _process = process;
    _url = null;

    const onData = (data: Buffer) => {
      const line = data.toString().trim();
      
      const urlMatch = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      
      if (urlMatch) {
        const url = urlMatch[0];
        _url = url;
        
        if (onUrl) {
          onUrl(url);
        } else {
          console.log("[Cloudflared] URL:", url);
        }

        clearTimeout(timeout);
        resolve({
          url: _url,
          tunnelId: _url.split("://")[1].split(".")[0],
          port: config.port,
          provider: "cloudflare",
        });
      } else if (line.includes("ERR") || line.includes("error")) {
        console.log("[Cloudflared]", line);
      }
    };

    process.stdout?.on("data", onData);
    process.stderr?.on("data", onData);
    process.on("error", (err: Error) => {
      clearTimeout(timeout);
      _process = null;
      reject(err);
    });
    process.on("exit", (code: number | null) => {
      // If no URL was captured, treat as failure even on clean exit
      if (!_url) {
        clearTimeout(timeout);
        _process = null;
        reject(new Error("cloudflared exited without providing a tunnel URL"));
        return;
      }
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        _process = null;
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

function findCloudflareD(
  paths: string[],
  existsSync?: (path: string) => boolean
): string | null {
  const checkExists = existsSync || ((p: string) => require("fs").existsSync(p));
  
  for (const p of paths) {
    try {
      if (checkExists(p)) return p;
    } catch {}
  }
  return null;
}

/**
 * Start a Cloudflare tunnel (legacy function - uses module state)
 */
export async function startCloudflareTunnel(config: TunnelConfig): Promise<TunnelInfo> {
  return createCloudflareTunnel(config);
}

/**
 * Stop the Cloudflare tunnel
 */
export async function stopCloudflareTunnel(): Promise<void> {
  if (_process) {
    _process.kill("SIGTERM");
    _process = null;
  }
  _url = null;
}

/**
 * Check if cloudflared is installed
 */
export async function isCloudflareInstalled(): Promise<boolean> {
  return findCloudflared() !== null;
}

/**
 * Get the current Cloudflare tunnel URL
 */
export function getCloudflareUrl(): string | null {
  return _url;
}

/**
 * Get current process (for testing)
 */
export function getProcess(): ChildProcess | null {
  return _process;
}

/**
 * Set process (for testing)
 */
export function setProcess(process: ChildProcess | null): void {
  _process = process;
}

/**
 * Set URL (for testing)
 */
export function setUrl(url: string | null): void {
  _url = url;
}

/**
 * Clear state (for testing)
 */
export function clearState(): void {
  _process = null;
  _url = null;
}
