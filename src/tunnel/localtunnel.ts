/**
 * Localtunnel tunnel provider implementation
 * 
 * Refactored for testability:
 * - Optional instance parameter for dependency injection
 * - Port validation
 * - Clean separation of concerns
 */

import localtunnel from "localtunnel";
import type { TunnelConfig, TunnelInfo } from "./types";

// Export the type for external use
export type { TunnelConfig, TunnelInfo };

// Module-level state (for backward compatibility)
// Use the factory functions for testable code
let _instance: any = null;

/**
 * Create a localtunnel instance
 * This function is testable - accepts external localtunnel for mocking
 */
export function createLocaltunnel(
  config: TunnelConfig,
  options: {
    localtunnelModule?: typeof localtunnel;
    onUrl?: (url: string) => void;
  } = {}
): Promise<TunnelInfo> {
  const { localtunnelModule = localtunnel, onUrl } = options;
  
  // Validate port
  if (!config.port || typeof config.port !== "number") {
    return Promise.reject(new Error("Invalid port: must be a number"));
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for localtunnel URL (30s)")),
      30000
    );

    localtunnelModule(
      { port: config.port, subdomain: config.subdomain },
      (err: any, tunnel: any) => {
        if (err) {
          clearTimeout(timeout);
          reject(new Error(`Localtunnel failed: ${err.message}`));
          return;
        }

        clearTimeout(timeout);
        _instance = tunnel;
        
        if (onUrl) {
          onUrl(tunnel.url);
        } else {
          console.log("[Tunnel] URL:", tunnel.url);
        }

        tunnel.on("close", () => {
          _instance = null;
        });

        resolve({
          url: tunnel.url,
          tunnelId: tunnel.url.split("://")[1].split(".")[0],
          port: config.port,
          provider: "localtunnel",
        });
      }
    );
  });
}

/**
 * Start a localtunnel (legacy function - uses module state)
 */
export async function startLocaltunnel(config: TunnelConfig): Promise<TunnelInfo> {
  return createLocaltunnel(config);
}

/**
 * Stop the localtunnel
 */
export async function stopLocaltunnel(): Promise<void> {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

/**
 * Get the current localtunnel URL
 */
export function getLocaltunnelUrl(): string | null {
  return _instance?.url || null;
}

/**
 * Get current instance (for testing)
 */
export function getInstance(): any {
  return _instance;
}

/**
 * Set instance (for testing)
 */
export function setInstance(instance: any): void {
  _instance = instance;
}

/**
 * Clear instance (for testing)
 */
export function clearInstance(): void {
  _instance = null;
}
