/**
 * Push notification sender
 */

import type { Notification } from "./types.js";
import { loadTokens, saveTokens } from "./token-store.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushResponse {
  data?: Array<{ status: string; details?: { error: string } }>;
}

/**
 * Send push notification to all registered devices
 */
export async function sendPush(notification: Notification): Promise<void> {
  const tokens = loadTokens();
  if (tokens.length === 0) {
    console.log("[PushPlugin] No push tokens registered, skipping notification");
    return;
  }

  console.log(`[PushPlugin] Sending notification to ${tokens.length} device(s)`);
  
  // Log per-token serverUrl usage
  tokens.forEach((t, i) => {
    if (t.serverUrl) {
      console.log(`[PushPlugin] Device ${i + 1}: Using custom serverUrl: ${t.serverUrl}`);
    } else {
      console.log(`[PushPlugin] Device ${i + 1}: Using tunnel URL`);
    }
  });
  
  console.log("[PushPlugin] Notification details:", {
    title: notification.title,
    body: notification.body,
    data: notification.data,
    android: notification.android ? "configured" : "not configured",
    ios: notification.ios ? "configured" : "not configured"
  });

  const messages = tokens.map(({ token, serverUrl }) => ({
    to: token,
    sound: "default",
    title: notification.title,
    ...(notification.subtitle && { subtitle: notification.subtitle }), // iOS subtitle
    body: notification.body,
    data: {
      ...notification.data,
      ...(serverUrl && { serverUrl }),
    },
    priority: "high",
    ...(notification.categoryId && { categoryId: notification.categoryId }),
    ...(notification.android && { android: notification.android }),
    ...(notification.ios && { ios: notification.ios }),
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error("[PushPlugin] Expo push API error:", res.status);
      return;
    }

    const result = (await res.json()) as ExpoPushResponse;
    console.log("[PushPlugin] Push send result:");
    console.log(`  Status: ${res.status}`);
    console.log(`  Messages sent: ${result.data?.length || 0}`);
    
    // Log individual message results
    result.data?.forEach((item: any, i: number) => {
      if (item.status === "ok") {
        console.log(`  [${i + 1}] ✅ Delivered successfully`);
      } else if (item.status === "error") {
        console.log(`  [${i + 1}] ❌ Error: ${item.details?.error || "unknown"}`);
      } else {
        console.log(`  [${i + 1}] ℹ️ Status: ${item.status}`);
      }
    });

    const invalidTokens = new Set<string>();
    result.data?.forEach((item: any, i: number) => {
      if (
        item.status === "error" &&
        ["DeviceNotRegistered", "InvalidCredentials"].includes(
          item.details?.error,
        )
      ) {
        invalidTokens.add(tokens[i].token);
      }
    });

    if (invalidTokens.size > 0) {
      saveTokens(tokens.filter((t) => !invalidTokens.has(t.token)));
      console.log(
        `[PushPlugin] Removed ${invalidTokens.size} invalid token(s)`,
      );
    }
  } catch (e) {
    console.error("[PushPlugin] Send error:", e);
  }
}
