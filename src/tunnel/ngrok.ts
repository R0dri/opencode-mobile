/**
 * Ngrok tunnel provider implementation
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import * as ngrok from "@ngrok/ngrok";
import type { TunnelConfig, TunnelInfo, NgrokDiagnostics } from "./types.js";

let ngrokInstance: any = null;
let ngrokSession: any = null;
let ngrokListener: any = null;

/**
 * Diagnose ngrok installation and configuration
 */
export async function diagnoseNgrok(): Promise<NgrokDiagnostics> {
  const diagnostics: NgrokDiagnostics = {
    installed: false,
    authtokenConfigured: false,
    authtokenValid: false,
    existingTunnels: 0,
    configPath: null,
    error: null,
  };

  try {
    await import("@ngrok/ngrok");
    diagnostics.installed = true;
  } catch {
    diagnostics.error = "@ngrok/ngrok SDK not available";
    return diagnostics;
  }

  const configPaths = [
    `${process.env.HOME}/Library/Application Support/ngrok/ngrok.yml`,
    `${process.env.HOME}/.config/ngrok/ngrok.yml`,
    "/etc/ngrok/ngrok.yml",
  ];

  for (const configPath of configPaths) {
    try {
      const { existsSync } = await import("fs");
      if (existsSync(configPath)) {
        diagnostics.configPath = configPath;
        break;
      }
    } catch {}
  }

  if (!diagnostics.configPath) {
    diagnostics.error = "No ngrok config found";
    return diagnostics;
  }

  try {
    const { readFileSync } = await import("fs");
    const configContent = readFileSync(diagnostics.configPath, "utf-8");
    
    // Check for v3 format first (current standard)
    const v3Match = configContent.match(/agent:\s*\n\s*authtoken:\s*(.+)/);
    // Fallback to v2 format (deprecated but still supported)
    const v2Match = configContent.match(/authtoken:\s*(.+)/);
    
    const authtoken = v3Match?.[1]?.trim() || v2Match?.[1]?.trim();
    
    if (authtoken && authtoken.length > 10) {
      diagnostics.authtokenConfigured = true;
      
      // Validate authtoken by calling ngrok API
      try {
        const { promisify } = await import("util");
        const execAsync = promisify((await import("child_process")).exec);
        
        // Quick API check - timeout after 5 seconds
        try {
          const result = await execAsync(
            `curl -s --max-time 5 -H "Authorization: Bearer ${authtoken}" https://api.ngrok.com/tunnels 2>&1`
          );
          
          const output = result.stdout + result.stderr;
          
          // Only fail on clear auth errors
          const hasAuthError = output.includes("ERR_NGROK_206") || 
                                output.includes("authentication") ||
                                output.includes("invalid_token") ||
                                output.includes("Unauthorized");
          
          if (hasAuthError && output.length < 200) {
            diagnostics.error = "Authtoken invalid or expired";
          } else {
            // Any other response means token is valid
            diagnostics.authtokenValid = true;
          }
        } catch {
          // If curl fails, proceed anyway - SDK might work
          diagnostics.authtokenValid = true;
        }
      } catch (e: any) {
        diagnostics.error = `Authtoken test failed: ${e.message}`;
      }
    } else {
      diagnostics.error = "No authtoken in config";
    }
  } catch (e: any) {
    diagnostics.error = `Failed to read config: ${e.message}`;
  }

  return diagnostics;
}

/**
 * Setup ngrok with user input for authtoken
 */
async function setupNgrokWithUserInput(): Promise<string | null> {
  console.log("\n[Setup] Ngrok configuration needed.");
  console.log("[Setup] 1. Get authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken");
  console.log("[Setup] 2. Run: ngrok config add-authtoken YOUR_AUTHTOKEN");
  console.log("");
  
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("[Setup] Paste your ngrok authtoken (or press Enter to skip): ", async (authtoken) => {
      rl.close();
      
      if (!authtoken || authtoken.trim().length < 10) {
        console.log("[Setup] Skipping ngrok setup.");
        resolve(null);
        return;
      }

      const token = authtoken.trim();
      
      try {
        const { promisify } = await import("util");
        const execAsync = promisify((await import("child_process")).exec);
        
        // Use ngrok config command which writes v3 format
        await execAsync(`ngrok config add-authtoken ${token}`);
        console.log("[Setup] Ngrok authtoken configured successfully! (v3 format)");
        resolve(token);
      } catch (e: any) {
        // If ngrok config command fails, write v3 format manually
        console.log("[Setup] Ngrok config command failed, writing config manually...");
        try {
          const { writeFileSync, existsSync, mkdirSync } = await import("fs");
          
          const configPath = `${process.env.HOME}/Library/Application Support/ngrok/ngrok.yml`;
          const configDir = `${process.env.HOME}/Library/Application Support/ngrok`;
          
          if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
          }
          
          // Write v3 format
          const v3Config = `version: "3"

agent:
  authtoken: ${token}
`;
          writeFileSync(configPath, v3Config);
          console.log("[Setup] Ngrok config written successfully! (v3 format)");
          resolve(token);
        } catch (writeError: any) {
          console.error(`[Setup] Failed to write config: ${writeError.message}`);
          resolve(null);
        }
      }
    });
  });
}

/**
 * Ensure ngrok is ready for use (diagnose + interactive setup if needed)
 */
export async function ensureNgrokReady(): Promise<{ ready: boolean; authtoken: string | null }> {
  console.log("\n[Diagnostics] Checking ngrok configuration...");
  
  const diagnostics = await diagnoseNgrok();
  
  console.log(`[Diagnostics] Installed: ${diagnostics.installed ? "✓" : "✗"}`);
  console.log(`[Diagnostics] Config: ${diagnostics.configPath || "none"}`);
  console.log(`[Diagnostics] Authtoken: ${diagnostics.authtokenConfigured ? "✓" : "✗"}`);
  
  if (diagnostics.error) {
    console.log(`[Diagnostics] Issue: ${diagnostics.error}`);
  }

  if (!diagnostics.installed) {
    console.log("\n[Setup] Ngrok SDK not available. Please ensure dependencies are installed: npm install");
    return { ready: false, authtoken: null };
  }

  if (!diagnostics.authtokenConfigured || diagnostics.error) {
    const authtoken = await setupNgrokWithUserInput();
    return { ready: !!authtoken, authtoken };
  }

  // Extract authtoken from config for SDK usage
  let authtokenValue: string | null = null;
  if (diagnostics.configPath) {
    try {
      const { readFileSync } = require("fs");
      const configContent = readFileSync(diagnostics.configPath, "utf-8");
      
      // Check for v3 format first (current standard)
      const v3Match = configContent.match(/agent:\s*\n\s*authtoken:\s*(.+)/);
      // Fallback to v2 format (deprecated but still supported)
      const v2Match = configContent.match(/authtoken:\s*(.+)/);
      
      const token = v3Match?.[1]?.trim() || v2Match?.[1]?.trim();
      if (token && token.length > 10) {
        authtokenValue = token;
      }
    } catch (e) {
      // Failed to read authtoken, continue without it
    }
  }
  
  console.log("[Diagnostics] Ngrok appears configured, attempting connection...");
  return { ready: true, authtoken: authtokenValue };
}

/**
 * Start an ngrok tunnel with multi-strategy fallback
 */
export async function startNgrokTunnel(config: TunnelConfig): Promise<TunnelInfo> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  async function cleanupNgrok(): Promise<void> {
    try {
      if (ngrokListener) {
        try {
          await ngrokListener.close();
          console.log("[Tunnel] Closed ngrok listener");
        } catch (e: any) {
          console.log("[Tunnel] Could not close listener:", e.message);
        }
        ngrokListener = null;
      }
      
      if (ngrokSession) {
        try {
          await ngrokSession.close();
          console.log("[Tunnel] Closed ngrok session");
        } catch (e: any) {
          console.log("[Tunnel] Could not close session:", e.message);
        }
        ngrokSession = null;
      }
      
      try {
        await ngrok.kill();
        console.log("[Tunnel] Killed ngrok process");
      } catch {}
      
      ngrokInstance = null;
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e: any) {
      console.log("[Tunnel] Could not clean up ngrok:", e.message);
    }
  }

  // First, ensure ngrok is properly configured
  const { ready, authtoken } = await ensureNgrokReady();
  
  if (!ready) {
    throw new Error("Ngrok not configured. Please set up your authtoken.");
  }

  await cleanupNgrok();

  console.log("\n[Tunnel] Starting ngrok...");

  // Get config path for debugging
  const configPaths = [
    `${process.env.HOME}/Library/Application Support/ngrok/ngrok.yml`,
    `${process.env.HOME}/.config/ngrok/ngrok.yml`,
    "/etc/ngrok/ngrok.yml",
  ];
  let activeConfigPath = "none";
  for (const p of configPaths) {
    try {
      const { existsSync } = require("fs");
      if (existsSync(p)) {
        activeConfigPath = p;
        break;
      }
    } catch {}
  }

  // Read config for debugging
  let configContent = "";
  if (activeConfigPath !== "none") {
    try {
      const { readFileSync } = require("fs");
      configContent = readFileSync(activeConfigPath, "utf-8");
    } catch { configContent = "(failed to read)"; }
  }

  console.log(`[Tunnel] Config: ${activeConfigPath}`);
  console.log(`[Tunnel] Format: ${configContent.includes('version: "3"') ? "v3" : configContent.includes("version: 2") ? "v2" : "unknown"}`);
  console.log(`[Tunnel] Token: ${configContent.includes("authtoken:") || configContent.includes("agent:") ? "✓" : "✗"}`);

  const strategies = [
    async () => {
      console.log("[Tunnel] Strategy 1: ngrok.forward() with direct token...");
      
      const token = config.authToken || authtoken;
      if (!token || typeof token !== "string") {
        throw new Error("No valid authtoken available for Strategy 1");
      }
      
      console.log(`[Tunnel] Token: ${token.substring(0, 8)}... (direct token)`);
      
      ngrokListener = await ngrok.forward({
        addr: config.port,
        authtoken: token,
      });
      
      const url = ngrokListener.url();
      console.log(`[Tunnel] URL: ${url}`);
      return url;
    },
    
    async () => {
      console.log("[Tunnel] Strategy 2: SessionBuilder with explicit session...");
      await cleanupNgrok();
      
      const token = config.authToken || authtoken;
      if (!token || typeof token !== "string") {
        throw new Error("No valid authtoken available for Strategy 2");
      }
      
      console.log(`[Tunnel] Token: ${token.substring(0, 8)}... (direct token)`);
      
      ngrokSession = await new ngrok.SessionBuilder()
        .authtoken(token)
        .metadata(`opencode-${Date.now()}`)
        .connect();
      
      ngrokListener = await ngrokSession.httpEndpoint()
        .listenAndForward(`localhost:${config.port}`);
      
      const url = ngrokListener.url();
      console.log(`[Tunnel] URL: ${url}`);
      return url;
    },
    
    async () => {
      console.log("[Tunnel] Strategy 3: ngrok binary...");
      await cleanupNgrok();
      
      const configPath = activeConfigPath !== "none" ? activeConfigPath : "";
      console.log(`[Tunnel] Config: ${configPath || "(default)"}`);
      
      const cmd = configPath 
        ? `ngrok http ${config.port} --config="${configPath}" --log=stdout 2>&1`
        : `ngrok http ${config.port} --log=stdout 2>&1`;
      
      console.log(`[Tunnel] Running: ngrok http ${config.port}`);
      
      const { spawn } = require("child_process");
      const ngrokProcess = spawn("sh", ["-c", cmd], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      
      let output = "";
      let resolved = false;
      let resolvePromise: (value: boolean) => void;
      
      const onData = (data: Buffer) => {
        const text = data.toString();
        output += text;
        
        const urlMatch = text.match(/url=([^\s]+)/);
        if (urlMatch && !resolved) {
          resolved = true;
          ngrokProcess.kill();
          if (resolvePromise) resolvePromise(true);
          console.log(`[Tunnel] URL: ${urlMatch[1]}`);
        }
      };
      
      ngrokProcess.stdout.on("data", onData);
      ngrokProcess.stderr.on("data", onData);
      
      const waitPromise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          if (!resolved) {
            ngrokProcess.kill();
            reject(new Error("timeout"));
          }
        }, 15000);
      });
      
      await Promise.race([waitPromise, timeoutPromise]);
      
      const finalUrlMatch = output.match(/url=([^\s]+)/);
      if (finalUrlMatch) {
        return finalUrlMatch[1];
      }
      
      throw new Error("failed to extract URL");
    },
  ];

  let lastError: Error | null = null;
  let firstAuthError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[Tunnel] Connecting to port ${config.port}...`);
      ngrokInstance = await strategies[i]();

      const tunnelUrl = ngrokInstance;
      const urlObj = new URL(tunnelUrl);
      const tunnelId = urlObj.hostname.split(".")[0];

      console.log("[Tunnel] URL:", tunnelUrl);
      
      return {
        url: tunnelUrl,
        tunnelId,
        port: config.port,
        provider: "ngrok",
      };
      
    } catch (error: any) {
      lastError = error;
      console.log(`[Tunnel] Strategy ${i + 1} failed: ${error.message}`);
      
      // Capture first auth-related error for proper detection
      const errorMsg = error.message.toLowerCase();
      const isAuthError = errorMsg.includes("invalid tunnel configuration") ||
                          errorMsg.includes("authtoken") ||
                          errorMsg.includes("authentication") ||
                          errorMsg.includes("auth token") ||
                          errorMsg.includes("session failed");
      
      if (isAuthError && !firstAuthError) {
        firstAuthError = error;
        console.log(`[Tunnel] Auth error detected in strategy ${i + 1}: ${error.message}`);
      }
      
      if (i === strategies.length - 1) {
        console.error(`[Tunnel] All strategies exhausted. Last error: ${error.message}`);
        
        // If we captured an auth error earlier, throw that instead
        if (firstAuthError) {
          console.error(`[Tunnel] Original auth error: ${firstAuthError.message}`);
          throw firstAuthError;
        }
        
        throw error;
      }
      
      console.log(`[Tunnel] Trying next strategy...`);
    }
  }

  throw lastError || new Error("Unknown error");
}

export async function stopNgrokTunnel(): Promise<void> {
  if (ngrokListener) {
    try {
      await ngrokListener.close();
    } catch {}
    ngrokListener = null;
  }
  if (ngrokSession) {
    try {
      await ngrokSession.close();
    } catch {}
    ngrokSession = null;
  }
  if (ngrokInstance) {
    try {
      await ngrokInstance.close();
    } catch {}
    ngrokInstance = null;
  }
  try {
    await ngrok.kill();
  } catch {}
}

/**
 * Stop ngrok (legacy name for compatibility)
 */
export async function stopNgrok(): Promise<void> {
  await stopNgrokTunnel();
}

/**
 * Check if ngrok SDK is available
 */
export async function isNgrokInstalled(): Promise<boolean> {
  try {
    await import("@ngrok/ngrok");
    return true;
  } catch {
    return false;
  }
}

// Test helper functions
/**
 * Get current ngrok instance (for testing)
 */
export function getInstance(): any {
  return ngrokInstance;
}

/**
 * Set ngrok instance (for testing)
 */
export function setInstance(instance: any): void {
  ngrokInstance = instance;
}

/**
 * Clear ngrok instance (for testing)
 */
export function clearInstance(): void {
  ngrokInstance = null;
}
