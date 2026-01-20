/**
 * opencode-mobile plugin - LAN-only push notification server
 * 
 * Architecture:
 * - Plugin server: LAN only (127.0.0.1) - handles /push-token and /tunnel endpoints
 * - Tunnel: Points directly to OpenCode server (not through plugin)
 * - Mobile connects: tunnel → OpenCode (SSE), or LAN → plugin (push tokens)
 */

console.log("\n=== opencode-mobile DEV ===");
console.log("LAN-only architecture: plugin handles push tokens, tunnel goes to OpenCode directly");

import * as path from "path";
import http from "http";

import type { Plugin } from "@opencode-ai/plugin";
import type { PushToken } from "./src/push";
import { loadTokens, saveTokens } from "./src/push/token-store";
import { startLocaltunnel, stopLocaltunnel, getLocaltunnelUrl } from "./src/tunnel/localtunnel";
import { displayQRCode } from "./src/tunnel/qrcode";
import { startNgrokTunnel, stopNgrokTunnel } from "./src/tunnel/ngrok";

const CONFIG_DIR = path.join(process.env.HOME || "", ".config/opencode");

// Server state
let httpServer: http.Server | null = null;
let activeTunnel: { url: string; tunnelId: string; port: number; provider: string } | null = null;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handle push-token requests (LAN only)
 */
async function handlePushToken(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  await new Promise((resolve) => req.on("end", resolve));

  if (req.url === "/push-token" && req.method === "POST") {
    try {
      const data = JSON.parse(body);
      const { token, platform, deviceId } = data;
      
      if (!token || !deviceId) {
        res.writeHead(400, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing fields" }));
        return;
      }

      const validPlatform = (platform === "ios" || platform === "android") ? platform : "ios";
      const tokens = loadTokens();
      const idx = tokens.findIndex((t) => t.deviceId === deviceId);
      const newToken: PushToken = { token, platform: validPlatform, deviceId, registeredAt: new Date().toISOString() };
      
      if (idx >= 0) tokens[idx] = newToken;
      else tokens.push(newToken);
      saveTokens(tokens);
      
      console.log("[Push] Token registered:", deviceId);
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    } catch {
      res.writeHead(400, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }

  if (req.url === "/push-token" && req.method === "GET") {
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: loadTokens().length }));
    return;
  }

  if (req.url === "/push-token" && req.method === "DELETE") {
    try {
      const data = JSON.parse(body);
      const { deviceId } = data;
      if (!deviceId) {
        res.writeHead(400, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing deviceId" }));
        return;
      }
      saveTokens(loadTokens().filter((t) => t.deviceId !== deviceId));
      console.log("[Push] Token removed:", deviceId);
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    } catch {
      res.writeHead(400, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }

  // 404 for other push-token paths
  res.writeHead(404, cors);
  res.end("Not found");
}

/**
 * Handle tunnel requests (LAN only)
 */
async function handleTunnel(req: http.IncomingMessage, res: http.ServerResponse, openCodePort: number): Promise<void> {
  let body = "";
  if (req.method === "POST") {
    req.on("data", (chunk) => { body += chunk; });
    await new Promise((resolve) => req.on("end", resolve));
  }

  if (req.url === "/tunnel" && req.method === "POST") {
    try {
      const data = JSON.parse(body);
      const targetPort = data.port || openCodePort;
      
      console.log("[Tunnel] Starting to port:", targetPort);
      
      let tunnel;
      try {
        tunnel = await startNgrokTunnel({ port: targetPort });
        console.log("[Tunnel] Ngrok started:", tunnel.url);
      } catch (ngrokError: any) {
        console.log("[Tunnel] Ngrok failed, trying localtunnel...");
        tunnel = await startLocaltunnel({ port: targetPort });
        console.log("[Tunnel] Localtunnel started:", tunnel.url);
      }
      
      activeTunnel = tunnel;
      await displayQRCode(tunnel.url);
      
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        type: tunnel.provider,
        url: tunnel.url,
        tunnelId: tunnel.tunnelId,
        port: tunnel.port,
        targetPort: targetPort,
        note: "Tunnel points directly to OpenCode server"
      }));
      return;
    } catch (error: any) {
      console.error("[Tunnel] Failed:", error.message);
      res.writeHead(500, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
  }

  if (req.url === "/tunnel" && req.method === "DELETE") {
    try {
      if (activeTunnel?.provider === "ngrok") {
        await stopNgrokTunnel();
      } else {
        await stopLocaltunnel();
      }
      activeTunnel = null;
      console.log("[Tunnel] Stopped");
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    } catch (error: any) {
      res.writeHead(500, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
  }

  if (req.url === "/tunnel" && req.method === "GET") {
    if (activeTunnel) {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: activeTunnel.provider,
        url: activeTunnel.url,
        tunnelId: activeTunnel.tunnelId,
        port: activeTunnel.port,
        targetPort: openCodePort
      }));
      return;
    }
    
    const localtunnelUrl = getLocaltunnelUrl();
    if (localtunnelUrl) {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "localtunnel",
        url: localtunnelUrl,
        tunnelId: localtunnelUrl.split("://")[1].split(".")[0]
      }));
      return;
    }
    
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "none", url: null }));
    return;
  }

  // 404 for other tunnel paths
  res.writeHead(404, cors);
  res.end("Not found");
}

/**
 * Start LAN-only HTTP server
 * Returns true if server started successfully, false if port was in use
 */
async function startServer(port: number, openCodePort: number): Promise<boolean> {
  return new Promise((resolve) => {
    httpServer = http.createServer((clientReq, clientRes) => {
      // CORS preflight
      if (clientReq.method === "OPTIONS") {
        clientRes.writeHead(204, cors);
        clientRes.end();
        return;
      }

      const url = clientReq.url || "";

      // Handle /push-token endpoints (LAN only)
      if (url.startsWith("/push-token")) {
        handlePushToken(clientReq, clientRes);
        return;
      }

      // Handle /tunnel endpoints (LAN only)
      if (url.startsWith("/tunnel")) {
        handleTunnel(clientReq, clientRes, openCodePort);
        return;
      }

      // Everything else: 404 (LAN only, no proxy)
      clientRes.writeHead(404, cors);
      clientRes.end("Not found - LAN-only server");
    });

    httpServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.log("[Push] Port in use, skipping");
        resolve(false);
      } else {
        console.error("[Push] Failed:", err.message);
        resolve(false);
      }
    });

    // Listen on 127.0.0.1 only (LAN only, not exposed externally)
    httpServer.listen(port, "127.0.0.1", () => {
      console.log(`[Push] LAN-only server running on port ${port}`);
      console.log(`[Push] /push-token/* → push token management`);
      console.log(`[Push] /tunnel/* → tunnel management`);
      console.log(`[Push] Tunnel target: OpenCode on port ${openCodePort}`);
      resolve(true);
    });
  });
}

export const PushNotificationPlugin: Plugin = async (ctx) => {
  // Check if we're running in "serve" mode (subcommand, not option)
  const isServeMode = process.argv.includes("serve");
  console.log("[PushPlugin] isServeMode:", isServeMode);
  console.log("[PushPlugin] process.argv:", process.argv.join(", "));

  if (!isServeMode) {
    console.log("[PushPlugin] Not in serve mode, skipping plugin");
    return {
      event: async ({ event }) => {
        // No-op when not in serve mode
      },
    };
  }

  const openCodePort = Number((ctx as any).serverUrl?.port) || 4096;
  const pluginPort = openCodePort + 1;  // Plugin on next port

  console.log("[DEV] openCodePort:", openCodePort, "| pluginPort:", pluginPort);

  // Start LAN-only server
  const serverStarted = await startServer(pluginPort, openCodePort);

  // Only start tunnel if server started successfully (port wasn't in use)
  if (!serverStarted) {
    console.log("[PushPlugin] Server already running, skipping plugin initialization");
    return {
      event: async ({ event }) => {
        // No-op when another instance is running
      },
    };
  }

  // Auto-start tunnel pointing to OpenCode DIRECTLY (not through plugin!)
  console.log("[DEV] Auto-starting tunnel...");
  try {
    const tunnel = await startNgrokTunnel({ port: openCodePort });
    console.log("[DEV] Tunnel started:", tunnel.url);
    activeTunnel = tunnel;
    await displayQRCode(tunnel.url);
  } catch (ngrokError: any) {
    console.log("[DEV] Ngrok failed, trying localtunnel...");
    try {
      const tunnel = await startLocaltunnel({ port: openCodePort });
      console.log("[DEV] Tunnel started:", tunnel.url);
      activeTunnel = tunnel;
      await displayQRCode(tunnel.url);
    } catch (localError: any) {
      console.error("[DEV] All tunnels failed:", localError.message);
    }
  }

  return {
    event: async ({ event }) => {
      console.log("[DEV] Event:", event.type);
    },
  };
};

export default PushNotificationPlugin;
