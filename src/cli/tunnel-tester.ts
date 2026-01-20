/**
 * Tunnel provider tester - ngrok, cloudflare, localtunnel
 */

import * as fs from "fs";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import type {
  AuditOptions,
  TunnelTestResult,
  TestResult,
} from "./types.js";
import { findCloudflared } from "../tunnel/cloudflare.js";
import { clearInstance as clearLocaltunnelInstance } from "../tunnel/localtunnel.js";
import { clearInstance as clearNgrokInstance } from "../tunnel/ngrok.js";

const execAsync = promisify(exec);

const CLOUDFLARED_PATHS = [
  "/usr/local/bin/cloudflared",
  "/usr/bin/cloudflared",
  `${process.env.HOME || ""}/.cloudflared/cloudflared`,
  "/opt/homebrew/bin/cloudflared",
];

/**
 * Test all tunnel providers
 */
export async function testTunnelProviders(
  port: number,
  options: AuditOptions
): Promise<{
  ngrok?: TunnelTestResult;
  cloudflare?: TunnelTestResult;
  localtunnel?: TunnelTestResult;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const ngrokResult = await testNgrok(port, options);
  results.push(...ngrokResult.results);

  const cloudflareResult = await testCloudflare(port, options);
  results.push(...cloudflareResult.results);

  const localtunnelResult = await testLocaltunnel(port, options);
  results.push(...localtunnelResult.results);

  return {
    ngrok: ngrokResult.result,
    cloudflare: cloudflareResult.result,
    localtunnel: localtunnelResult.result,
    results,
  };
}

/**
 * Test ngrok provider
 */
async function testNgrok(
  port: number,
  _options: AuditOptions
): Promise<{ result?: TunnelTestResult; results: TestResult[] }> {
  const results: TestResult[] = [];
  const result: TunnelTestResult = {
    provider: "ngrok",
    installed: false,
    configured: false,
  };

  // Test 1: Check if ngrok is installed
  const startInstall = Date.now();
  try {
    const { stdout } = await execAsync("which ngrok");
    result.installed = true;
    result.installedPath = stdout.trim();
    results.push({
      name: "ngrok: Installed",
      category: "tunnel",
      status: "pass",
      message: `Found at ${stdout.trim()}`,
      duration: Date.now() - startInstall,
    });
  } catch {
    results.push({
      name: "ngrok: Installed",
      category: "tunnel",
      status: "fail",
      message: "ngrok not found in PATH",
      duration: Date.now() - startInstall,
    });
    return { result, results };
  }

  // Test 2: Check configuration
  const startConfig = Date.now();
  const configPaths = [
    `${process.env.HOME}/Library/Application Support/ngrok/ngrok.yml`,
    `${process.env.HOME}/.config/ngrok/ngrok.yml`,
    "/etc/ngrok/ngrok.yml",
  ];

  let configPath: string | null = null;
  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (configPath) {
    result.configured = true;
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const hasAuthtoken =
        content.includes("authtoken:") || content.includes("agent:") && content.includes("authtoken:");
      result.configured = hasAuthtoken;
      results.push({
        name: "ngrok: Configured",
        category: "tunnel",
        status: hasAuthtoken ? "pass" : "warn",
        message: hasAuthtoken
          ? `Config at ${configPath}`
          : "Config exists but no authtoken found",
        duration: Date.now() - startConfig,
      });
    } catch {
      results.push({
        name: "ngrok: Configured",
        category: "tunnel",
        status: "fail",
        message: `Failed to read config at ${configPath}`,
        duration: Date.now() - startConfig,
      });
    }
  } else {
    results.push({
      name: "ngrok: Configured",
      category: "tunnel",
      status: "fail",
      message: "No ngrok config file found",
      duration: Date.now() - startConfig,
    });
  }

  // Test 3: Try to establish connection
  const startConnect = Date.now();
  clearNgrokInstance();

  try {
    const { startNgrokTunnel } = await import("../tunnel/ngrok.js");
    const tunnel = await startNgrokTunnel({ port });
    result.connection = {
      success: true,
      url: tunnel.url,
      tunnelId: tunnel.tunnelId,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "ngrok: Connection",
      category: "tunnel",
      status: "pass",
      message: `Established: ${tunnel.url}`,
      duration: Date.now() - startConnect,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.connection = {
      success: false,
      error: errorMessage,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "ngrok: Connection",
      category: "tunnel",
      status: "fail",
      message: `Connection failed: ${errorMessage}`,
      duration: Date.now() - startConnect,
      error: errorMessage,
    });
  }

  return { result, results };
}

/**
 * Test cloudflare provider
 */
async function testCloudflare(
  port: number,
  _options: AuditOptions
): Promise<{ result?: TunnelTestResult; results: TestResult[] }> {
  const results: TestResult[] = [];
  const result: TunnelTestResult = {
    provider: "cloudflare",
    installed: false,
    configured: false,
  };

  // Test 1: Check if cloudflared is installed
  const startInstall = Date.now();
  const cloudflaredPath = findCloudflared(CLOUDFLARED_PATHS);

  if (cloudflaredPath) {
    result.installed = true;
    result.installedPath = cloudflaredPath;
    results.push({
      name: "cloudflare: Installed",
      category: "tunnel",
      status: "pass",
      message: `Found at ${cloudflaredPath}`,
      duration: Date.now() - startInstall,
    });
  } else {
    results.push({
      name: "cloudflare: Installed",
      category: "tunnel",
      status: "fail",
      message: "cloudflared not found in PATH",
      duration: Date.now() - startInstall,
    });
    return { result, results };
  }

  // Test 2: Check configuration (optional)
  const startConfig = Date.now();
  const cloudflareConfigPaths = [
    `${process.env.HOME}/.cloudflared/config.yml`,
    `${process.env.HOME}/.cloudflared/creds`,
  ];

  let hasConfig = false;
  for (const p of cloudflareConfigPaths) {
    if (fs.existsSync(p)) {
      hasConfig = true;
      break;
    }
  }

  result.configured = hasConfig;
  results.push({
    name: "cloudflare: Configured",
    category: "tunnel",
    status: hasConfig ? "pass" : "warn",
    message: hasConfig
      ? "Configuration file found"
      : "No config file (will use defaults)",
    duration: Date.now() - startConfig,
  });

  // Test 3: Try to establish connection
  const startConnect = Date.now();

  try {
    const { startCloudflareTunnel } = await import("../tunnel/cloudflare.js");
    const tunnel = await startCloudflareTunnel({ port });
    result.connection = {
      success: true,
      url: tunnel.url,
      tunnelId: tunnel.tunnelId,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "cloudflare: Connection",
      category: "tunnel",
      status: "pass",
      message: `Established: ${tunnel.url}`,
      duration: Date.now() - startConnect,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.connection = {
      success: false,
      error: errorMessage,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "cloudflare: Connection",
      category: "tunnel",
      status: "fail",
      message: `Connection failed: ${errorMessage}`,
      duration: Date.now() - startConnect,
      error: errorMessage,
    });
  }

  return { result, results };
}

/**
 * Test localtunnel provider
 */
async function testLocaltunnel(
  port: number,
  _options: AuditOptions
): Promise<{ result?: TunnelTestResult; results: TestResult[] }> {
  const results: TestResult[] = [];
  const result: TunnelTestResult = {
    provider: "localtunnel",
    installed: false,
    configured: true, // localtunnel doesn't need config
  };

  // Test 1: Check if localtunnel package is available
  const startInstall = Date.now();
  try {
    await import("localtunnel");
    result.installed = true;
    results.push({
      name: "localtunnel: Installed",
      category: "tunnel",
      status: "pass",
      message: "npm package available",
      duration: Date.now() - startInstall,
    });
  } catch {
    results.push({
      name: "localtunnel: Installed",
      category: "tunnel",
      status: "fail",
      message: "localtunnel package not found",
      duration: Date.now() - startInstall,
    });
    return { result, results };
  }

  // Test 2: Try to establish connection
  const startConnect = Date.now();
  clearLocaltunnelInstance();

  try {
    const { startLocaltunnel } = await import("../tunnel/localtunnel.js");
    const tunnel = await startLocaltunnel({ port });
    result.connection = {
      success: true,
      url: tunnel.url,
      tunnelId: tunnel.tunnelId,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "localtunnel: Connection",
      category: "tunnel",
      status: "pass",
      message: `Established: ${tunnel.url}`,
      duration: Date.now() - startConnect,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.connection = {
      success: false,
      error: errorMessage,
      duration: Date.now() - startConnect,
    };
    results.push({
      name: "localtunnel: Connection",
      category: "tunnel",
      status: "fail",
      message: `Connection failed: ${errorMessage}`,
      duration: Date.now() - startConnect,
      error: errorMessage,
    });
  }

  return { result, results };
}

/**
 * Compare tunnel providers and return recommendations
 */
export function compareTunnelProviders(results: {
  ngrok?: TunnelTestResult;
  cloudflare?: TunnelTestResult;
  localtunnel?: TunnelTestResult;
}): string[] {
  const recommendations: string[] = [];

  const available: string[] = [];
  const fastest = { provider: "", duration: Infinity };

  if (results.ngrok?.connection?.success) {
    available.push("ngrok");
    if (results.ngrok.connection.duration < fastest.duration) {
      fastest.provider = "ngrok";
      fastest.duration = results.ngrok.connection.duration;
    }
  }

  if (results.cloudflare?.connection?.success) {
    available.push("cloudflare");
    if (results.cloudflare.connection.duration < fastest.duration) {
      fastest.provider = "cloudflare";
      fastest.duration = results.cloudflare.connection.duration;
    }
  }

  if (results.localtunnel?.connection?.success) {
    available.push("localtunnel");
    if (results.localtunnel.connection.duration < fastest.duration) {
      fastest.provider = "localtunnel";
      fastest.duration = results.localtunnel.connection.duration;
    }
  }

  if (available.length === 0) {
    recommendations.push(
      "No tunnel providers are working. Check your network connection and credentials."
    );
  } else if (available.length === 1) {
    recommendations.push(
      `Only ${available[0]} is available. Consider setting up additional providers for redundancy.`
    );
  } else {
    recommendations.push(
      `${available.join(", ")} are available. ${fastest.provider} is the fastest.`
    );
  }

  return recommendations;
}
