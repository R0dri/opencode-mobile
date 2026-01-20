/**
 * Localtunnel tunnel provider implementation
 */

import localtunnel from "localtunnel";
import type { TunnelConfig, TunnelInfo } from "./types";

let localtunnelInstance: any = null;

/**
 * Start a localtunnel
 */
export async function startLocaltunnel(config: TunnelConfig): Promise<TunnelInfo> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for localtunnel URL (30s)")),
      30000
    );

    localtunnel({ port: config.port, subdomain: config.subdomain }, (err: any, tunnel: any) => {
      if (err) {
        clearTimeout(timeout);
        reject(new Error(`Localtunnel failed: ${err.message}`));
        return;
      }

      clearTimeout(timeout);
      localtunnelInstance = tunnel;
      
      console.log("[Tunnel] URL:", tunnel.url);

      tunnel.on("close", () => {
        localtunnelInstance = null;
      });

      resolve({
        url: tunnel.url,
        tunnelId: tunnel.url.split("://")[1].split(".")[0],
        port: config.port,
        provider: "localtunnel",
      });
    });
  });
}

/**
 * Stop the localtunnel
 */
export async function stopLocaltunnel(): Promise<void> {
  if (localtunnelInstance) {
    localtunnelInstance.close();
    localtunnelInstance = null;
  }
}

/**
 * Get the current localtunnel URL
 */
export function getLocaltunnelUrl(): string | null {
  return localtunnelInstance?.url || null;
}
