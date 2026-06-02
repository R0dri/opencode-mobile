/**
 * Token storage for push notifications
 */

import * as fs from "fs";
import * as path from "path";
import type { PushToken } from "./types.js";

const CONFIG_DIR = path.join(process.env.HOME || "", ".config/opencode");
const TOKEN_FILE = path.join(CONFIG_DIR, "push-tokens.json");

/**
 * Load stored push tokens from disk
 */
export function loadTokens(): PushToken[] {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[PushPlugin] Load error:", e);
  }
  return [];
}

/**
 * Save push tokens to disk
 */
export function saveTokens(tokens: PushToken[]): void {
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  const cleaned = text.replace(/\n/g, " ").trim();
  return cleaned.length <= max
    ? cleaned
    : cleaned.substring(0, max - 3) + "...";
}
