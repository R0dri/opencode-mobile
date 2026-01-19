/**
 * Tunnel manager - unified interface for all tunnel providers
 */

import type { TunnelConfig, TunnelInfo, TunnelDetails } from "./types";
import { startNgrokTunnel, stopNgrokTunnel, diagnoseNgrok } from "./ngrok";
import { startLocaltunnel, stopLocaltunnel } from "./localtunnel";
import { startCloudflareTunnel, stopCloudflareTunnel } from "./cloudflare";
import { displayQRCode } from "./qrcode";

let currentTunnel: TunnelInfo | null = null;

/**
 * Start a tunnel with the specified provider
 */
export async function startTunnel(config: TunnelConfig): Promise<TunnelInfo> {
  const provider = config.provider || "ngrok";

  switch (provider) {
    case "ngrok":
      currentTunnel = await startNgrokTunnel(config);
      break;
    case "localtunnel":
      currentTunnel = await startLocaltunnel(config);
      break;
    case "cloudflare":
      currentTunnel = await startCloudflareTunnel(config);
      break;
    default:
      throw new Error(`Unknown tunnel provider: ${provider}`);
  }

  return currentTunnel;
}

/**
 * Stop the current tunnel
 */
export async function stopTunnel(): Promise<void> {
  if (!currentTunnel) {
    return;
  }

  switch (currentTunnel.provider) {
    case "ngrok":
      await stopNgrokTunnel();
      break;
    case "localtunnel":
      await stopLocaltunnel();
      break;
    case "cloudflare":
      await stopCloudflareTunnel();
      break;
  }

  currentTunnel = null;
}

/**
 * Display QR code for tunnel URL
 */
export function displayQR(tunnelInfo: TunnelInfo): void {
  displayQRCode(tunnelInfo.url);
}

/**
 * Get current tunnel details
 */
export function getTunnelDetails(): TunnelDetails {
  return {
    type: currentTunnel?.provider || "none",
    url: currentTunnel?.url || null,
    loginStatus: "unknown",
    loginId: null,
    configPath: null,
  };
}

/**
 * Get current tunnel info
 */
export function getTunnelInfo(): TunnelInfo | null {
  return currentTunnel;
}

/**
 * Get current server URL from tunnel
 */
export function getServerUrl(): string {
  if (!currentTunnel) {
    throw new Error("No tunnel active");
  }
  return currentTunnel.url;
}
