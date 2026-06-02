/**
 * opencode-mobile plugin - LAN-only push notification server
 * 
 * Architecture:
 * - Plugin server: LAN only (127.0.0.1) - handles /push-token and /tunnel endpoints
 * - Tunnel: Points directly to OpenCode server (not through plugin)
 * - Mobile connects: tunnel → OpenCode (SSE), or LAN → plugin (push tokens)
 */

import * as fs from "fs";

// Get plugin version first thing - for visual tracking in logs
function getPluginVersion(): string {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const raw = fs.readFileSync(pkgUrl, "utf-8");
    const data = JSON.parse(raw) as { version?: unknown };
    return typeof data.version === "string" ? data.version : "unknown";
  } catch {
    return "unknown";
  }
}

// Log version immediately on module load (before any other code runs)
console.log(`[opencode-mobile] v${getPluginVersion()}`);

const DEBUG_ENABLED = process.env.OPENCODE_MOBILE_DEBUG === "1";
const debugLog = (...args: unknown[]): void => {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
};

debugLog("\n=== opencode-mobile DEV ===");
debugLog("LAN-only architecture: plugin handles push tokens, tunnel goes to OpenCode directly");
debugLog("[PushPlugin][Mobile] Entry loaded: index.ts");

import * as path from "path";
import http from "http";

import { tool } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode-ai/plugin";
import type { PushToken } from "./src/push/index.js";
import { formatNotification } from "./src/push/formatter.js";
import { sendPush } from "./src/push/sender.js";
import { loadTokens, saveTokens } from "./src/push/token-store.js";
import { startLocaltunnel, stopLocaltunnel, getLocaltunnelUrl } from "./src/tunnel/localtunnel.js";
import { displayQRCode, generateQRCodeAscii, generateQRCodeAsciiPlain } from "./src/tunnel/qrcode.js";
import { startNgrokTunnel, stopNgrokTunnel, isNgrokInstalled } from "./src/tunnel/ngrok.js";
import { startCloudflareTunnel, stopCloudflareTunnel, getCloudflareUrl, isCloudflareInstalled } from "./src/tunnel/cloudflare.js";
import { updateTunnelMetadata, clearTunnelMetadata, loadTunnelMetadata } from "./src/tunnel/metadata.js";

function logPluginVersion(ctx: Parameters<Plugin>[0]): void {
  const client = (ctx as any)?.client;
  const appLog = client?.app?.log;
  if (typeof appLog !== "function") {
    return;
  }

  const version = getPluginVersion();
  // Do not await during init; avoid recursion/hangs in startup paths.
  setTimeout(() => {
    Promise.resolve(
      appLog.call(client.app, {
        body: {
          service: "opencode-mobile",
          level: "debug",
          message: `opencode-mobile v${version}`,
          extra: {
            version,
          },
        },
      })
    ).catch(() => {
      // Best-effort; never block plugin init.
    });
  }, 750);
}

// Server state
let httpServer: http.Server | null = null;
let activeTunnel: { url: string; tunnelId: string; port: number; provider: string } | null = null;

// Tunnel provider configuration
const VALID_PROVIDERS = ["cloudflare", "ngrok", "localtunnel", "auto"] as const;
type TunnelProvider = typeof VALID_PROVIDERS[number];

/**
 * Get the configured tunnel provider from environment variable
 * Defaults to 'auto' if not set or invalid
 */
function getTunnelProvider(): TunnelProvider {
  const provider = process.env.TUNNEL_PROVIDER?.toLowerCase() as TunnelProvider;
  if (VALID_PROVIDERS.includes(provider)) {
    return provider;
  }
  return "auto";
}

/**
 * Start a tunnel with fallback logic based on TUNNEL_PROVIDER env var
 * - 'auto': Try cloudflare → ngrok → localtunnel (in order of trustworthiness)
 * - Specific provider: Try only that provider
 */
async function startTunnelWithFallback(port: number): Promise<{ url: string; tunnelId: string; port: number; provider: string }> {
  const provider = getTunnelProvider();

  if (provider === "auto") {
    console.log("[Tunnel] Auto mode: selecting provider in order of security (cloudflare → ngrok → localtunnel)...");

    // Try Cloudflare first (most secure)
    if (await isCloudflareInstalled()) {
      try {
        console.log("[Tunnel] Auto-selecting Cloudflare (most secure)...");
        const tunnel = await startCloudflareTunnel({ port });
        console.log("[Tunnel] Cloudflare started:", tunnel.url);
        return tunnel;
      } catch (error: any) {
        console.log("[Tunnel] Cloudflare failed:", error.message);
      }
    } else {
      console.log("[Tunnel] Cloudflare not installed, skipping...");
    }

    // Try Ngrok second
    if (await isNgrokInstalled()) {
      try {
        console.log("[Tunnel] Auto-selecting Ngrok...");
        const tunnel = await startNgrokTunnel({ port });
        console.log("[Tunnel] Ngrok started:", tunnel.url);
        return tunnel;
      } catch (error: any) {
        console.log("[Tunnel] Ngrok failed:", error.message);
      }
    } else {
      console.log("[Tunnel] Ngrok not installed, skipping...");
    }

    // Fall back to Localtunnel (always available, least secure)
    console.log("[Tunnel] Auto-selecting Localtunnel (fallback - always available)...");
    const tunnel = await startLocaltunnel({ port });
    console.log("[Tunnel] Localtunnel started:", tunnel.url);
    return tunnel;
  }

  // Specific provider requested
  console.log(`[Tunnel] Using specific provider: ${provider}`);

  switch (provider) {
    case "cloudflare": {
      if (!(await isCloudflareInstalled())) {
        throw new Error("Cloudflare tunnel requested but cloudflared is not installed. Install from https://github.com/cloudflare/cloudflared");
      }
      const tunnel = await startCloudflareTunnel({ port });
      console.log("[Tunnel] Cloudflare started:", tunnel.url);
      return tunnel;
    }
    case "ngrok": {
      if (!(await isNgrokInstalled())) {
        throw new Error("Ngrok tunnel requested but @ngrok/ngrok is not installed. Run: npm install @ngrok/ngrok");
      }
      const tunnel = await startNgrokTunnel({ port });
      console.log("[Tunnel] Ngrok started:", tunnel.url);
      return tunnel;
    }
    case "localtunnel": {
      const tunnel = await startLocaltunnel({ port });
      console.log("[Tunnel] Localtunnel started:", tunnel.url);
      return tunnel;
    }
    default:
      throw new Error(`Unknown tunnel provider: ${provider}. Valid options: ${VALID_PROVIDERS.join(", ")}`);
  }
}

function getOpenCodeBaseUrl(ctx: Parameters<Plugin>[0]): string | null {
  const serverUrl = (ctx as any)?.serverUrl;
  if (serverUrl instanceof URL) {
    return serverUrl.origin;
  }

  const port = Number(serverUrl?.port);
  if (Number.isFinite(port) && port > 0) {
    return `http://127.0.0.1:${port}`;
  }

  return null;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`[PushPlugin] HTTP ${res.status} for ${url}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractSessionIdFromEvent(event: any): string | null {
  const props = (event as any)?.properties ?? {};
  const id =
    props.sessionID ||
    props.sessionId ||
    (event as any)?.sessionID ||
    (event as any)?.sessionId ||
    null;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function pickString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function getLastAssistantTextFromMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as any;
    const role = msg?.info?.role;
    if (role !== "assistant") continue;
    const parts = msg?.parts;
    if (!Array.isArray(parts)) continue;

    const textParts = parts
      .filter((p: any) => p?.type === "text" && typeof p?.text === "string")
      .map((p: any) => p.text.trim())
      .filter(Boolean);

    const combined = textParts.join("\n\n").trim();
    if (combined) return combined;
  }

  return null;
}

async function enrichEventForNotification(
  ctx: Parameters<Plugin>[0],
  event: any,
): Promise<any> {
  if (event?.type !== "session.idle") {
    return event;
  }

  const sessionID = extractSessionIdFromEvent(event);
  if (!sessionID) {
    return event;
  }

  const baseUrl = getOpenCodeBaseUrl(ctx);
  if (!baseUrl) {
    return event;
  }

  const props = { ...(event.properties ?? {}) } as Record<string, unknown>;

  const existingTitle =
    (typeof props.title === "string" && props.title) ||
    (typeof props.sessionTitle === "string" && props.sessionTitle) ||
    null;
  const existingLast = typeof props.lastAssistantMessage === "string" ? props.lastAssistantMessage : "";
  const existingDirectory = typeof props.directory === "string" ? props.directory : "";
  const existingParent =
    (typeof props.parentSessionId === "string" && props.parentSessionId) ||
    (typeof props.parentSessionID === "string" && props.parentSessionID) ||
    (typeof props.parentId === "string" && props.parentId) ||
    (typeof props.parentID === "string" && props.parentID) ||
    "";

  try {
    if (!existingTitle || !existingDirectory || !existingParent) {
      const sessionInfo = await fetchJson(
        `${baseUrl}/session/${encodeURIComponent(sessionID)}`,
        1200,
      );

      const title = pickString(sessionInfo, "title");
      const directory = pickString(sessionInfo, "directory");
      const parentSessionId =
        pickString(sessionInfo, "parentSessionId") ||
        pickString(sessionInfo, "parentSessionID") ||
        pickString(sessionInfo, "parentId") ||
        pickString(sessionInfo, "parentID") ||
        "";

      if (!existingTitle && title) {
        props.title = title;
        props.sessionTitle = title;
      }

      if (!existingDirectory && directory) {
        props.directory = directory;
        props.projectPath = directory;
      }

      if (!existingParent && parentSessionId) {
        props.parentSessionId = parentSessionId;
        props.parentSessionID = parentSessionId;
        props.parentId = parentSessionId;
        props.parentID = parentSessionId;
      }
    }
  } catch (error: unknown) {
    debugLog("[PushPlugin] Failed to fetch session info:", error);
  }

  try {
    if (!existingLast) {
      const msgs = await fetchJson(
        `${baseUrl}/session/${encodeURIComponent(sessionID)}/message?limit=50`,
        1600,
      );
      const lastText = getLastAssistantTextFromMessages(msgs);
      if (lastText) {
        props.lastAssistantMessage = lastText;
      }
    }
  } catch (error: unknown) {
    debugLog("[PushPlugin] Failed to fetch session messages:", error);
  }

  return { ...event, properties: props };
}

function getNotificationServerUrl(ctx: Parameters<Plugin>[0]): string {
  if (activeTunnel?.url) {
    return activeTunnel.url;
  }

  const metadata = loadTunnelMetadata();
  if (metadata.url) {
    return metadata.url;
  }

  const serverUrl = (ctx as any)?.serverUrl;
  if (serverUrl instanceof URL) {
    return serverUrl.toString();
  }

  return "";
}

async function maybeSendPushFromEvent(ctx: Parameters<Plugin>[0], event: any): Promise<void> {
  const serverUrl = getNotificationServerUrl(ctx);

  try {
    const enriched = await enrichEventForNotification(ctx, event);
    const notification = formatNotification(enriched, serverUrl, ctx as any);
    if (notification) {
      await sendPush(notification);
    }
  } catch (error: unknown) {
    console.error("[PushPlugin] Failed to format/send notification:", error);
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TEST_PUSH_ENABLED = process.env.OPENCODE_MOBILE_TEST_PUSH === "1";

function formatMobileQrMessage(url: string, qr: string): string {
  if (!qr) {
    return url;
  }

  // Code block preserves whitespace so the QR stays aligned.
  return `\`\`\`\n${qr}\n\`\`\`\n${url}`;
}

function loadTunnelUrlFromPath(tunnelPath: string): string | null {
  try {
    if (!fs.existsSync(tunnelPath)) {
      return null;
    }
    const raw = fs.readFileSync(tunnelPath, "utf-8");
    const data = JSON.parse(raw) as { url?: string | null };
    if (typeof data.url === "string" && data.url.startsWith("http")) {
      return data.url;
    }
  } catch (error: unknown) {
    console.error("[PushPlugin] Failed to read tunnel path:", error);
  }
  return null;
}

/**
 * Parse mobile command arguments to extract token and optional serverUrl
 * Format: "ExponentPushToken[xxx]" or "ExponentPushToken[xxx] ServerUrl[http://...]"
 */
function parseMobileCommand(input: string): { token: string; serverUrl?: string } | null {
  const trimmed = input.trim();

  // Match token in format ExponentPushToken[xxx] or similar
  const tokenMatch = trimmed.match(/^(ExponentPushToken\[[^\]]+\])/);
  if (!tokenMatch) {
    return null;
  }

  const token = tokenMatch[1];
  const remaining = trimmed.slice(token.length).trim();

  // Check for ServerUrl[yyy] format
  const serverUrlMatch = remaining.match(/^ServerUrl\[([^\]]+)\]$/);
  if (serverUrlMatch) {
    const serverUrl = serverUrlMatch[1];
    // Basic validation - must start with http:// or https://
    if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
      return { token, serverUrl };
    }
  }

  // If no serverUrl or invalid format, return just the token
  return { token };
}

const mobileTool = tool({
  description: "Generate a mobile connection QR code",
  args: {
    url: tool.schema.string().optional().describe("Tunnel URL to render as QR"),
    tunnelPath: tool.schema
      .string()
      .optional()
      .describe("Path to tunnel.json containing a URL"),
    token: tool.schema
      .string()
      .optional()
      .describe("Push token to register/update for notifications"),
  },
  async execute(args) {
    const rawToken = args.token?.trim();
    if (rawToken) {
      const parsed = parseMobileCommand(rawToken);
      if (!parsed) {
        return "Invalid token format. Expected: ExponentPushToken[xxx] or ExponentPushToken[xxx] ServerUrl[http://...]";
      }
      const result = registerPushToken(parsed.token, parsed.serverUrl);
      const action = result.added ? "Registered" : "Updated";
      const serverUrlMsg = parsed.serverUrl ? ` with server URL: ${parsed.serverUrl}` : "";
      return `Push token ${action.toLowerCase()}${serverUrlMsg}.`;
    }

    const rawUrl = args.url?.trim();
    const urlFromPath = args.tunnelPath ? loadTunnelUrlFromPath(args.tunnelPath) : null;
    const metadataUrl = loadTunnelMetadata().url;
    const url = rawUrl || urlFromPath || metadataUrl || "";

    if (!url || !url.startsWith("http")) {
      return "No tunnel URL found.";
    }

    const qr = await generateQRCodeAsciiPlain(url);
    return formatMobileQrMessage(url, qr);
  },
});

function registerPushToken(token: string, serverUrl?: string): { added: boolean; total: number } {
  const trimmed = token.trim();
  const tokens = loadTokens();
  const existingIndex = tokens.findIndex((t) => t.token === trimmed || t.deviceId === trimmed);
  const now = new Date().toISOString();

  const newToken: PushToken = {
    token: trimmed,
    platform: "ios",
    deviceId: trimmed,
    registeredAt: now,
    ...(serverUrl && { serverUrl }),
  };

  if (existingIndex >= 0) {
    tokens[existingIndex] = { ...tokens[existingIndex], ...newToken };
    saveTokens(tokens);
    return { added: false, total: tokens.length };
  }

  tokens.push(newToken);
  saveTokens(tokens);
  return { added: true, total: tokens.length };
}

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

      const tunnel = await startTunnelWithFallback(targetPort);
      activeTunnel = tunnel;
      await displayQRCode(tunnel.url);

      // Save tunnel metadata to .config/opencode/tunnel.json
      updateTunnelMetadata(
        tunnel.url,
        tunnel.tunnelId,
        tunnel.provider,
        tunnel.port,
        targetPort
      );

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
      if (activeTunnel?.provider === "cloudflare") {
        await stopCloudflareTunnel();
      } else if (activeTunnel?.provider === "ngrok") {
        await stopNgrokTunnel();
      } else {
        await stopLocaltunnel();
      }
      activeTunnel = null;

      // Clear tunnel metadata from .config/opencode/tunnel.json
      clearTunnelMetadata();

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
    // Load stored metadata from .config/opencode/tunnel.json
    const storedMetadata = loadTunnelMetadata();

    if (activeTunnel) {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: activeTunnel.provider,
        url: activeTunnel.url,
        tunnelId: activeTunnel.tunnelId,
        port: activeTunnel.port,
        targetPort: openCodePort,
        metadata: storedMetadata
      }));
      return;
    }

    const cloudflareUrl = getCloudflareUrl();
    if (cloudflareUrl) {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "cloudflare",
        url: cloudflareUrl,
        tunnelId: cloudflareUrl.split("//")[1]?.split(".")[0] || "cloudflare",
        metadata: storedMetadata
      }));
      return;
    }

    const localtunnelUrl = getLocaltunnelUrl();
    if (localtunnelUrl) {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "localtunnel",
        url: localtunnelUrl,
        tunnelId: localtunnelUrl.split("://")[1].split(".")[0],
        metadata: storedMetadata
      }));
      return;
    }

    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({
      type: "none",
      url: null,
      metadata: storedMetadata
    }));
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
        debugLog("[Push] Port in use, skipping");
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
  console.log("[opencode-mobile] Plugin init called");
  debugLog("[PushPlugin][Mobile] Initialized");

  logPluginVersion(ctx);

  // Only run the plugin LAN server + auto-tunnel in `opencode serve` mode.
  //
  // IMPORTANT:
  // - OpenCode initializes plugins for other commands too (e.g. `opencode debug wait`).
  // - Those commands may still provide `ctx.serverUrl`, so `!!ctx.serverUrl` is NOT a safe
  //   proxy for "serve mode" and will cause ngrok/localtunnel to start unexpectedly.
  // - Bun preserves the OpenCode subcommand tokens in `process.argv` (serve/debug/wait/etc),
  //   so we gate on the presence of the literal `serve` token.
  const hasServerUrl = !!(ctx as any)?.serverUrl;
  const isAttachMode = process.argv.includes("attach");
  const isServeMode = process.argv.includes("serve") && !isAttachMode;

  debugLog("[PushPlugin] hasServerUrl:", hasServerUrl);
  debugLog("[PushPlugin] isAttachMode:", isAttachMode);
  debugLog("[PushPlugin] isServeMode:", isServeMode);
  debugLog("[PushPlugin] process.argv:", process.argv.join(", "));

  if (!isServeMode) {
    console.log(
      "[opencode-mobile] Plugin init OK; skipping (not in 'serve' mode). " +
        "Run: opencode serve ...",
    );
    return {
      tool: {
        mobile: mobileTool,
      },
      event: async () => {
        // No-op unless running in `opencode serve` mode.
      },
    };
  }

  const openCodePort = Number((ctx as any).serverUrl?.port) || 4096;
  const pluginPort = openCodePort + 1;  // Plugin on next port

  debugLog("[DEV] openCodePort:", openCodePort, "| pluginPort:", pluginPort);

  // Start LAN-only server
  const serverStarted = await startServer(pluginPort, openCodePort);

  // Only start tunnel if server started successfully (port wasn't in use)
  if (!serverStarted) {
    debugLog("[PushPlugin] Server already running, skipping plugin initialization");
    return {
      tool: {
        mobile: mobileTool,
      },
      event: async () => {
        // No-op when another instance is running
      },
    };
  }

  // Auto-start tunnel pointing to OpenCode DIRECTLY (not through plugin!)
  debugLog("[DEV] Auto-starting tunnel...");
  try {
    const tunnel = await startTunnelWithFallback(openCodePort);
    debugLog("[DEV] Tunnel started:", tunnel.url);
    activeTunnel = tunnel;
    await displayQRCode(tunnel.url);

    // Save tunnel metadata to .config/opencode/tunnel.json
    updateTunnelMetadata(
      tunnel.url,
      tunnel.tunnelId,
      tunnel.provider,
      tunnel.port,
      openCodePort
    );
  } catch (tunnelError: any) {
    console.error("[DEV] Failed to start tunnel:", tunnelError.message);
  }

  return {
    tool: {
      mobile: mobileTool,
    },
    event: async ({ event }) => {
      const eventType = (() => {
        if (!event || typeof event !== "object") return null;
        const value = (event as Record<string, unknown>).type;
        return typeof value === "string" ? value : null;
      })();

      if (
        eventType === "session.idle" ||
        eventType === "session.error" ||
        eventType === "permission.updated" ||
        eventType === "permission.asked"
      ) {
        // Debug: Log event structure to diagnose child session detection
        if (DEBUG_ENABLED && eventType === "session.idle") {
          const props = (event as any)?.properties;
          console.log("[PushPlugin][DEBUG] session.idle event:");
          console.log("  - event.parentSessionId:", (event as any)?.parentSessionId);
          console.log("  - event.parentId:", (event as any)?.parentId);
          console.log("  - properties.parentSessionId:", props?.parentSessionId);
          console.log("  - properties.parentId:", props?.parentId);
          console.log("  - properties.parentSessionID:", props?.parentSessionID);
          console.log("  - properties.info?.parentSessionId:", props?.info?.parentSessionId);
          console.log("  - properties.info?.parentId:", props?.info?.parentId);
          console.log("  - Full event:", JSON.stringify(event, null, 2));
        }
        void maybeSendPushFromEvent(ctx, event);
      }

      if (event.type === "command.executed") {
        debugLog("[PushPlugin] command.executed payload:", JSON.stringify((event as any).properties));

        const props = (event as any).properties ?? {};
        if (
          TEST_PUSH_ENABLED &&
          props?.name === "mobile" &&
          typeof props?.arguments === "string"
        ) {
          void sendPush({
            title: "OpenCode Mobile",
            body: "Test push from /mobile",
            data: {
              type: "mobile.test",
              serverUrl: getNotificationServerUrl(ctx),
              arguments: props.arguments,
              sessionId: props.sessionID,
              messageId: props.messageID,
            },
          });
        }
      }
    },
  };
};

export default PushNotificationPlugin;

if (import.meta.main) {
  const main = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      const metadata = loadTunnelMetadata();
      if (!metadata.url) {
        console.log("No tunnel URL found.");
        process.exit(1);
      }
      const qr = await generateQRCodeAscii(metadata.url);
      if (qr) {
        console.log(`${qr}\n${metadata.url}`);
      } else {
        console.log(metadata.url);
      }
    } else {
      const token = args.join(" ");
      const result = registerPushToken(token);
      const action = result.added ? "Registered" : "Updated";
      console.log(`Push token ${action.toLowerCase()}.`);
    }
  };
  main();
}
