/**
 * Cloudflare tunnel provider implementation
 */

import { spawn } from "child_process";
import type { TunnelConfig, TunnelInfo } from "./types";

let cloudflareProcess: any = null;
let cloudflareUrl: string | null = null;

/**
 * Find cloudflared binary in common locations
 */
export function findCloudflared(): string | null {
  const paths = [
    "/usr/local/bin/cloudflared",
    "/usr/bin/cloudflared",
    `${process.env.HOME}/.cloudflared/cloudflared`,
    "/opt/homebrew/bin/cloudflared",
  ];
  for (const p of paths) {
    try {
      if (require("fs").existsSync(p)) return p;
    } catch {}
  }
  return null;
}

/**
 * Start a Cloudflare tunnel
 */
export async function startCloudflareTunnel(config: TunnelConfig): Promise<TunnelInfo> {
  const cloudflaredPath = findCloudflared();
  if (!cloudflaredPath)
    throw new Error(
      "cloudflared not found. Install from https://github.com/cloudflare/cloudflared"
    );

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for cloudflared URL (60s)")),
      60000
    );

    cloudflareProcess = spawn(cloudflaredPath, [
      "tunnel",
      "--url",
      `http://127.0.0.1:${config.port}`,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    const onData = (data: Buffer) => {
      const line = data.toString().trim();
      
      const urlMatch = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      
      if (urlMatch) {
        const url = urlMatch[0];
        console.log("[Cloudflared] URL:", url);
        clearTimeout(timeout);
        cloudflareUrl = url;
        resolve({
          url: cloudflareUrl,
          tunnelId: cloudflareUrl.split("://")[1].split(".")[0],
          port: config.port,
          provider: "cloudflare",
        });
      } else if (line.includes("ERR") || line.includes("error")) {
        console.log("[Cloudflared]", line);
      }
    };

    cloudflareProcess.stdout?.on("data", onData);
    cloudflareProcess.stderr?.on("data", onData);
    cloudflareProcess.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
    cloudflareProcess.on("exit", (code: number | null) => {
      // If no URL was captured, treat as failure even on clean exit
      if (!cloudflareUrl) {
        clearTimeout(timeout);
        reject(new Error("cloudflared exited without providing a tunnel URL"));
        return;
      }
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

/**
 * Stop the Cloudflare tunnel
 */
export async function stopCloudflareTunnel(): Promise<void> {
  if (cloudflareProcess) {
    cloudflareProcess.kill("SIGTERM");
    cloudflareProcess = null;
  }
  cloudflareUrl = null;
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
  return cloudflareUrl;
}
