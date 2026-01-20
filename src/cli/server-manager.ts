/**
 * Server manager for starting/stopping the plugin server
 */

import * as http from "http";
import * as path from "path";
import type {
  AuditOptions,
  ServerInfo,
} from "./types.js";
import { loadTokens, saveTokens } from "../push/token-store.js";
import {
  startLocaltunnel,
  stopLocaltunnel,
  getLocaltunnelUrl,
} from "../tunnel/localtunnel.js";
import { startNgrokTunnel, stopNgrokTunnel } from "../tunnel/ngrok.js";
import { displayQRCode } from "../tunnel/qrcode.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface PushToken {
  token: string;
  platform: "ios" | "android";
  deviceId: string;
  registeredAt: string;
}

let server: http.Server | null = null;
let activeTunnel: { url: string; tunnelId: string; port: number; provider: string } | null =
  null;

/**
 * Handle push-token requests
 */
async function handlePushToken(req: http.IncomingMessage): Promise<{
  status: number;
  body: string;
  headers: Record<string, string>;
}> {
  const url = new URL(req.url || "", `http://localhost`);
  const method = req.method || "GET";

  // OPTIONS - CORS preflight
  if (method === "OPTIONS") {
    return { status: 204, body: "", headers: CORS };
  }

  // POST /push-token - Register token
  if (url.pathname === "/push-token" && method === "POST") {
    try {
      const body = await getRequestBody(req);
      const parsed = JSON.parse(body) as { token?: string; platform?: string; deviceId?: string };
      const { token, platform, deviceId } = parsed;

      if (!token || !deviceId) {
        return {
          status: 400,
          body: JSON.stringify({ error: "Missing fields" }),
          headers: { ...CORS, "Content-Type": "application/json" },
        };
      }

      const validPlatform = platform === "android" ? "android" : "ios";
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

      console.log("[Audit] Token registered:", deviceId);
      return {
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    } catch {
      return {
        status: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }
  }

  // GET /push-token - Get count
  if (url.pathname === "/push-token" && method === "GET") {
    const count = loadTokens().length;
    return {
      status: 200,
      body: JSON.stringify({ count }),
      headers: { ...CORS, "Content-Type": "application/json" },
    };
  }

  // DELETE /push-token - Remove token
  if (url.pathname === "/push-token" && method === "DELETE") {
    try {
      const body = await getRequestBody(req);
      const parsed = JSON.parse(body) as { deviceId?: string };
      const { deviceId } = parsed;

      if (!deviceId) {
        return {
          status: 400,
          body: JSON.stringify({ error: "Missing deviceId" }),
          headers: { ...CORS, "Content-Type": "application/json" },
        };
      }

      saveTokens(loadTokens().filter((t) => t.deviceId !== deviceId));
      console.log("[Audit] Token removed:", deviceId);
      return {
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    } catch {
      return {
        status: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }
  }

  return { status: 404, body: "Not found", headers: CORS };
}

/**
 * Handle tunnel requests
 */
async function handleTunnel(req: http.IncomingMessage): Promise<{
  status: number;
  body: string;
  headers: Record<string, string>;
}> {
  const url = new URL(req.url || "", `http://localhost`);
  const method = req.method || "GET";

  // OPTIONS - CORS preflight
  if (method === "OPTIONS") {
    return { status: 204, body: "", headers: CORS };
  }

  // POST /tunnel - Start tunnel
  if (url.pathname === "/tunnel" && method === "POST") {
    try {
      const body = await getRequestBody(req);
      const parsed = JSON.parse(body) as { port?: number };
      const port = parsed.port || 3000;

      let tunnel;
      try {
        console.log("[Audit] Trying ngrok on port:", port);
        tunnel = await startNgrokTunnel({ port });
        console.log("[Audit] Ngrok tunnel started:", tunnel.url);
      } catch (ngrokError: unknown) {
        const errorMessage = ngrokError instanceof Error ? ngrokError.message : String(ngrokError);
        console.log("[Audit] Ngrok failed, trying localtunnel...", errorMessage);
        tunnel = await startLocaltunnel({ port });
        console.log("[Audit] Localtunnel started:", tunnel.url);
      }

      activeTunnel = tunnel;
      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          type: tunnel.provider,
          url: tunnel.url,
          tunnelId: tunnel.tunnelId,
          port: tunnel.port,
        }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Audit] All tunnels failed:", errorMessage);
      return {
        status: 500,
        body: JSON.stringify({ error: errorMessage }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }
  }

  // DELETE /tunnel - Stop tunnel
  if (url.pathname === "/tunnel" && method === "DELETE") {
    try {
      if (activeTunnel?.provider === "ngrok") {
        await stopNgrokTunnel();
      } else {
        await stopLocaltunnel();
      }
      activeTunnel = null;
      console.log("[Audit] Tunnel stopped");
      return {
        status: 200,
        body: JSON.stringify({ success: true }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 500,
        body: JSON.stringify({ error: errorMessage }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }
  }

  // GET /tunnel - Get tunnel info
  if (url.pathname === "/tunnel" && method === "GET") {
    if (activeTunnel) {
      return {
        status: 200,
        body: JSON.stringify({
          type: activeTunnel.provider,
          url: activeTunnel.url,
          tunnelId: activeTunnel.tunnelId,
          port: activeTunnel.port,
        }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }

    const localtunnelUrl = getLocaltunnelUrl();
    if (localtunnelUrl) {
      return {
        status: 200,
        body: JSON.stringify({
          type: "localtunnel",
          url: localtunnelUrl,
          tunnelId: localtunnelUrl.split("://")[1].split(".")[0],
        }),
        headers: { ...CORS, "Content-Type": "application/json" },
      };
    }

    return {
      status: 200,
      body: JSON.stringify({ type: "none", url: null }),
      headers: { ...CORS, "Content-Type": "application/json" },
    };
  }

  return { status: 404, body: "Not found", headers: CORS };
}

/**
 * Get request body as string
 */
async function getRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Send HTTP response
 */
function sendResponse(
  res: http.ServerResponse,
  status: number,
  body: string,
  headers: Record<string, string>
): void {
  res.writeHead(status, headers);
  res.end(body);
}

/**
 * Start the server
 */
export async function startServer(
  options: AuditOptions
): Promise<{ port: number; proxyPort: number }> {
  const serverPort = options.port || 4096;
  const proxyPort = options.proxyPort || serverPort + 1;

  console.log(`[Audit] Starting server on port ${serverPort} (proxy: ${proxyPort})`);

  return new Promise((resolve, reject) => {
    server = http.createServer((clientReq, clientRes) => {
      const url = clientReq.url || "";

      // Handle /push-token directly
      if (url.startsWith("/push-token")) {
        handlePushToken(clientReq).then((response) => {
          sendResponse(clientRes, response.status, response.body, response.headers);
        });
        return;
      }

      // Handle /tunnel requests
      if (url.startsWith("/tunnel")) {
        handleTunnel(clientReq).then((response) => {
          sendResponse(clientRes, response.status, response.body, response.headers);
        });
        return;
      }

      // Default: 404 for audit server (we don't proxy in audit mode)
      clientRes.writeHead(404, CORS);
      clientRes.end("Not found");
    });

    server.on("error", (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Audit] Server error:", errorMessage);
      reject(new Error(`Server failed to start: ${errorMessage}`));
    });

    server.listen(serverPort, "127.0.0.1", () => {
      console.log(`[Audit] Server started on port ${serverPort}`);
      resolve({ port: serverPort, proxyPort });
    });
  });
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  if (activeTunnel) {
    try {
      if (activeTunnel.provider === "ngrok") {
        await stopNgrokTunnel();
      } else {
        await stopLocaltunnel();
      }
    } catch {
      // Ignore cleanup errors
    }
    activeTunnel = null;
  }

  if (server) {
    return new Promise((resolve) => {
      server?.close(() => {
        console.log("[Audit] Server stopped");
        server = null;
        resolve();
      });
    });
  }
}

/**
 * Check if server is reachable
 */
export async function checkServer(
  port: number
): Promise<{ reachable: boolean; corsConfigured: boolean; responseTime: number }> {
  const start = Date.now();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/push-token`, {
      method: "GET",
    });
    const responseTime = Date.now() - start;

    const corsHeaders = response.headers.get("access-control-allow-origin");
    return {
      reachable: true,
      corsConfigured: corsHeaders === "*",
      responseTime,
    };
  } catch {
    return {
      reachable: false,
      corsConfigured: false,
      responseTime: Date.now() - start,
    };
  }
}

/**
 * Get server info
 */
export async function getServerInfo(
  port: number
): Promise<ServerInfo> {
  const check = await checkServer(port);
  return {
    port,
    proxyPort: port + 1,
    reachable: check.reachable,
    corsConfigured: check.corsConfigured,
  };
}
