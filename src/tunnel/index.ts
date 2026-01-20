/**
 * Tunnel manager - unified interface for all tunnel providers
 */

import * as fs from "fs";
import type { TunnelConfig, TunnelInfo, TunnelDetails } from "./types";
import { 
  startNgrokTunnel, 
  stopNgrokTunnel, 
  diagnoseNgrok, 
  ensureNgrokReady 
} from "./ngrok";
import { 
  startLocaltunnel, 
  stopLocaltunnel, 
  getLocaltunnelUrl 
} from "./localtunnel";
import { 
  startCloudflareTunnel, 
  stopCloudflareTunnel, 
  getCloudflareUrl 
} from "./cloudflare";
import { displayQRCode } from "./qrcode";

let currentTunnel: TunnelInfo | null = null;

/**
 * Start a tunnel with the specified provider
 */
export async function startTunnel(config: TunnelConfig): Promise<TunnelInfo> {
  // Validate that we have a proper TunnelConfig object
  if (!config || typeof config !== "object") {
    console.log("[Tunnel] startTunnel called with invalid config type:", typeof config);
    throw new Error("Invalid tunnel config: config must be an object");
  }

  // Check if this looks like the OpenCode client context (has 'client' property)
  if ("client" in config) {
    console.log("[Tunnel] startTunnel called with OpenCode client context instead of TunnelConfig");
    console.log("[Tunnel] This indicates a plugin initialization issue");
    throw new Error("Invalid tunnel config: received OpenCode client context");
  }

  if (!config?.port) {
    console.log("[Tunnel] startTunnel called with invalid config:", JSON.stringify(config).substring(0, 200));
    throw new Error("Invalid tunnel config: port is required");
  }
  
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
export async function displayQR(tunnelInfo: TunnelInfo): Promise<void> {
  // Validate that we have a proper TunnelInfo object, not the OpenCode client context
  if (!tunnelInfo || typeof tunnelInfo !== "object") {
    console.log("[Tunnel] displayQR called with invalid tunnelInfo type:", typeof tunnelInfo);
    return;
  }

  // Check if this looks like the OpenCode client context (has 'client' property)
  if ("client" in tunnelInfo) {
    console.log("[Tunnel] displayQR called with OpenCode client context instead of TunnelInfo");
    console.log("[Tunnel] This indicates a plugin initialization issue");
    return;
  }

  if (!tunnelInfo?.url) {
    console.log("[Tunnel] displayQR called with invalid tunnelInfo:", JSON.stringify(tunnelInfo).substring(0, 200));
    console.log("[Tunnel] Stack:", new Error().stack?.split("\n").slice(2, 6).join("\n"));
    return;
  }

  await displayQRCode(tunnelInfo.url);
}

/**
 * Get current tunnel details with login status
 */
export function getTunnelDetails(): TunnelDetails {
  const details: TunnelDetails = {
    type: "none",
    url: null,
    loginStatus: "unknown",
    loginId: null,
    configPath: null,
  };

  // Determine tunnel type and URL
  if (currentTunnel) {
    details.type = currentTunnel.provider;
    details.url = currentTunnel.url;
  } else if (getLocaltunnelUrl()) {
    details.type = "localtunnel";
    details.url = getLocaltunnelUrl();
  } else if (getCloudflareUrl()) {
    details.type = "cloudflare";
    details.url = getCloudflareUrl();
  }

  // Get config path for ngrok
  const configPaths = [
    `${process.env.HOME}/Library/Application Support/ngrok/ngrok.yml`,
    `${process.env.HOME}/.config/ngrok/ngrok.yml`,
    "/etc/ngrok/ngrok.yml",
  ];

  for (const p of configPaths) {
    try {
      if (fs.existsSync(p)) {
        details.configPath = p;
        break;
      }
    } catch {}
  }

  // Check ngrok config for login status
  if (details.configPath && details.type === "ngrok") {
    try {
      const configContent = fs.readFileSync(details.configPath, "utf-8");
      
      // Check for authtoken (indicates logged in)
      if (configContent.includes("authtoken:")) {
        details.loginStatus = "authenticated";
        
        // Try to extract account info from config comments
        const accountMatch = configContent.match(/account:\s*(.+)/);
        if (accountMatch) {
          details.loginId = accountMatch[1].trim();
        }
      } else {
        details.loginStatus = "free";
      }
    } catch {}
  }

  // Localtunnel is always free/anonymous
  if (details.type === "localtunnel") {
    details.loginStatus = "anonymous";
  }

  // Cloudflare might have config info
  if (details.type === "cloudflare") {
    details.loginStatus = "unknown";
  }

  return details;
}

/**
 * Get current tunnel info
 */
export function getTunnelInfo(): TunnelInfo | null {
  if (!currentTunnel?.url) {
    return null;
  }
  return currentTunnel;
}

/**
 * Get current server URL from tunnel
 */
export function getServerUrl(): string {
  if (!currentTunnel?.url) {
    throw new Error("No tunnel active");
  }
  return currentTunnel.url;
}

/**
 * Graceful shutdown
 */
export async function gracefulShutdown(): Promise<void> {
  console.log("\n[Tunnel] Graceful shutdown...");
  await stopTunnel();
  console.log("[Tunnel] Shutdown complete");
}

// Handle process signals for graceful shutdown
const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    await gracefulShutdown();
    process.exit(0);
  });
});

// Re-export ngrok utilities
export { diagnoseNgrok, ensureNgrokReady };
