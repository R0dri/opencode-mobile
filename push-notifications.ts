import * as fs from "fs";
import * as path from "path";
import * as net from "net";

declare const Bun: any;

import type { Plugin } from "@opencode-ai/plugin";
import { startTunnel, stopTunnel, displayQR, getTunnelDetails } from "./src/tunnel";
import { getNextAvailablePort } from "./src/utils/port";
import type { PushToken, Notification, NotificationEvent, PluginContext } from "./src/push";
import { loadTokens, saveTokens, truncate } from "./src/push/token-store";
import { formatNotification } from "./src/push/formatter";
import { sendPush } from "./src/push/sender";

import { createLogger, configureLogger } from "./sdk-logger";

const CONFIG_DIR = path.join(process.env.HOME || "", ".config/opencode");

// Simple console logging (no client.log dependency)
const logger = createLogger("PushPlugin");
const TOKEN_FILE = path.join(CONFIG_DIR, "push-tokens.json");

let tokenServerStarted = false;
let pluginInitialized = false;
let bunServer: any = null;
let bunServerPort: number | null = null;

async function startTokenServer(
  openCodeUrl: string,
  port: number,
): Promise<void> {
  if (tokenServerStarted) return;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-opencode-directory",
  };

  bunServer = Bun.serve({
    port: port,
    hostname: "0.0.0.0",
    idleTimeout: 0, // Disable timeout for SSE connections
    async fetch(req: Request) {
      const url = new URL(req.url);
      if (req.method === "OPTIONS")
        return new Response(null, { status: 204, headers: cors });

      if (url.pathname === "/push-token" && req.method === "POST") {
        const body = (await req.json()) as {
          token?: string;
          platform?: string;
          deviceId?: string;
        };
        const { token, platform, deviceId } = body;
        if (!token || !deviceId)
          return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400,
            headers: cors,
          });

        // Validate platform field
        const validPlatform = (platform && (platform === "ios" || platform === "android")) 
          ? platform 
          : "ios";

        const tokens = loadTokens();
        const idx = tokens.findIndex((t) => t.deviceId === deviceId);
        const newToken: PushToken = {
          token,
          platform: validPlatform,
          deviceId,
          registeredAt: new Date().toISOString(),
        };
        if (idx >= 0) tokens[idx] = newToken;
        else tokens.push(newToken);
        saveTokens(tokens);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: cors,
        });
      }

      if (url.pathname === "/push-token" && req.method === "DELETE") {
        const body = (await req.json()) as { deviceId?: string };
        const { deviceId } = body;
        saveTokens(loadTokens().filter((t) => t.deviceId !== deviceId));
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: cors,
        });
      }

      if (url.pathname === "/push-token" && req.method === "GET") {
        return new Response(JSON.stringify({ count: loadTokens().length }), {
          status: 200,
          headers: cors,
        });
      }

      if (url.pathname === "/push-token/test" && req.method === "POST") {
        await sendPush({
          title: "Test",
          body: "Push notifications working!",
          data: { type: "test", serverUrl: openCodeUrl },
        });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: cors,
        });
      }

      // Return tunnel information
      if (url.pathname === "/tunnel" && req.method === "GET") {
        const details = getTunnelDetails();
        return new Response(JSON.stringify(details, null, 2), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Proxy everything else directly to OpenCode server (transparent)
      const pathname = url.pathname + url.search;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        const proxyReq = new Request(`${openCodeUrl}${pathname}`, {
          method: req.method,
          headers: req.headers,
          body: req.body,
          redirect: "follow",
          signal: controller.signal,
        });
        try {
          return await fetch(proxyReq);
        } catch (e: any) {
          if (e.name === 'AbortError') {
            return new Response("Gateway timeout", { status: 504, headers: cors });
          }
          throw e;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (e) {
        logger.error("Proxy error:", e);
        return new Response("Proxy error", { status: 502, headers: cors });
      }
    },
  });

  tokenServerStarted = true;
}


function stopAll(): void {
  logger.info("Shutting down...");

  stopTunnel();
  if (bunServer) {
    logger.info("Stopping Bun server...");
    bunServer.stop();
    bunServer = null;
  }
  tokenServerStarted = false;
  logger.info("Shutdown complete");
}

export const PushNotificationPlugin: Plugin = async (ctx) => {
  if (pluginInitialized) {
    return { event: async ({ event }) => {} };
  }
  pluginInitialized = true;

  // Skip tunnel setup in server mode (no --serve flag)
  const processArgs = process.argv.slice(2).join(' ');
  const hasServeFlag = processArgs.includes('--serve') || processArgs.includes('serve');
  
  if (!hasServeFlag) {
    return {
      event: async ({ event }) => {},
    };
  }

  const serverPort = parseInt(String((ctx as any).serverUrl?.port || 4096), 10);
  logger.info(`App started. Creating tunnel on port ${serverPort}`);

  // Test logging levels (dev-only verbose output)
  logger.dev("Detailed development info - only appears in dev mode");
  logger.info("Standard operational message - appears in both dev and prod");
  logger.warn("Non-critical issue warning");
  logger.error("Critical failure message");

  // Get server port from ctx, find next available for push-token
  const pushTokenPort = await getNextAvailablePort(serverPort + 1);
  bunServerPort = pushTokenPort;
  const openCodeUrl = `http://127.0.0.1:${serverPort}`;
  
  logger.info(`Token API: http://127.0.0.1:${pushTokenPort} → ${openCodeUrl}`);

  try {
    await startTokenServer(openCodeUrl, pushTokenPort);
    
    let tunnelInfo: any;
    let ngrokFailed = false;
    
    try {
      // Create tunnel directly to OpenCode server (transparent proxy)
      tunnelInfo = await startTunnel({ port: serverPort, provider: "ngrok" });
    } catch (ngrokError: any) {
      const errorMsg = ngrokError.message.toLowerCase();
      const isAuthIssue = errorMsg.includes("invalid tunnel configuration") || 
                          errorMsg.includes("authtoken") ||
                          errorMsg.includes("authentication") ||
                          errorMsg.includes("auth token") ||
                          errorMsg.includes("session failed") ||
                          errorMsg.includes("connect to api.ngrok.com");
      
      if (isAuthIssue) {
        logger.info("Ngrok needs authtoken (ERR_NGROK_4018)");
        logger.info("Skipping ngrok setup - will use fallback tunnels");
        ngrokFailed = true;
      } else {
        ngrokFailed = true;
      }
      
      if (ngrokFailed) {
        logger.info("Trying localtunnel...");
        try {
          tunnelInfo = await startTunnel({ port: serverPort, provider: "localtunnel" });
        } catch (localtunnelError: any) {
          logger.error("Localtunnel failed:", localtunnelError.message);
          throw new Error("All tunnel providers failed");
        }
      }
    }
    
    if (!tunnelInfo) {
      throw new Error("Failed to establish tunnel");
    }

    displayQR(tunnelInfo);

    return {
      event: async ({ event }) => {
        // Format notification from event
        const notification = formatNotification(event, tunnelInfo.url, ctx);
        
        if (!notification) {
          // No notification needed for this event type
          return;
        }

        // Log the raw event that triggered this push
        const eventAny = event as any;
        logger.info("Raw event received", {
          type: event.type,
          sessionID: eventAny.sessionID || eventAny.sessionId,
          timestamp: eventAny.timestamp,
          properties: event.properties
        });

        // Log the formatted notification
        logger.info("Sending push notification", {
          title: notification.title,
          body: notification.body,
          sessionId: notification.data?.sessionId,
          type: notification.data?.type
        });

        // Send the push notification
        await sendPush(notification);
        
        logger.dev("Push notification sent successfully");
      },
    };
  } catch (error: any) {
    logger.error("Failed:", error.message);
    return { event: async ({ event }) => {} };
  }
};

process.on("SIGTERM", () => {
  stopAll();
});
process.on("SIGINT", () => {
  stopAll();
});
process.on("SIGHUP", () => {
  stopAll();
});

export default PushNotificationPlugin;
