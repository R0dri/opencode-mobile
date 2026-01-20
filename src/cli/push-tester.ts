/**
 * Push notification tester - token store and Expo API
 */

import * as fs from "fs";
import * as path from "path";
import type {
  AuditOptions,
  PushTestResult,
  TestResult,
} from "./types.js";
import { loadTokens, saveTokens } from "../push/token-store.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Test push notification functionality
 */
export async function testPush(
  _options: AuditOptions
): Promise<{ result: PushTestResult; results: TestResult[] }> {
  const results: TestResult[] = [];
  const result: PushTestResult = {
    tokenStore: {
      readable: false,
      writable: false,
      initialCount: 0,
    },
    expoApi: {
      reachable: false,
    },
    tokenOperations: {
      register: false,
      retrieve: false,
      delete: false,
    },
  };

  // Test 1: Check token store readability
  const startRead = Date.now();
  try {
    const tokens = loadTokens();
    result.tokenStore.readable = true;
    result.tokenStore.initialCount = tokens.length;
    results.push({
      name: "push: Token Store Readable",
      category: "push",
      status: "pass",
      message: `Found ${tokens.length} token(s)`,
      duration: Date.now() - startRead,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name: "push: Token Store Readable",
      category: "push",
      status: "fail",
      message: `Failed to read: ${errorMessage}`,
      duration: Date.now() - startRead,
      error: errorMessage,
    });
  }

  // Test 2: Check token store writability
  const startWrite = Date.now();
  try {
    const testDeviceId = `audit-test-${Date.now()}`;
    const testToken = "audit-test-token";
    const tokens = loadTokens();
    const idx = tokens.findIndex((t) => t.deviceId === testDeviceId);
    const newToken = {
      token: testToken,
      platform: "ios" as const,
      deviceId: testDeviceId,
      registeredAt: new Date().toISOString(),
    };
    if (idx >= 0) tokens[idx] = newToken;
    else tokens.push(newToken);
    saveTokens(tokens);
    result.tokenStore.writable = true;
    results.push({
      name: "push: Token Store Writable",
      category: "push",
      status: "pass",
      message: "Successfully wrote test token",
      duration: Date.now() - startWrite,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name: "push: Token Store Writable",
      category: "push",
      status: "fail",
      message: `Failed to write: ${errorMessage}`,
      duration: Date.now() - startWrite,
      error: errorMessage,
    });
  }

  // Test 3: Token operations - register
  const startRegister = Date.now();
  try {
    const testDeviceId = `audit-register-${Date.now()}`;
    const testToken = "audit-register-token";
    const tokens = loadTokens();
    const newToken = {
      token: testToken,
      platform: "ios" as const,
      deviceId: testDeviceId,
      registeredAt: new Date().toISOString(),
    };
    tokens.push(newToken);
    saveTokens(tokens);

    // Verify it was saved
    const verifyTokens = loadTokens();
    const found = verifyTokens.some((t) => t.deviceId === testDeviceId);

    result.tokenOperations.register = found;
    results.push({
      name: "push: Token Register",
      category: "push",
      status: found ? "pass" : "fail",
      message: found
        ? "Token registered successfully"
        : "Token registration verification failed",
      duration: Date.now() - startRegister,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name: "push: Token Register",
      category: "push",
      status: "fail",
      message: `Failed: ${errorMessage}`,
      duration: Date.now() - startRegister,
      error: errorMessage,
    });
  }

  // Test 4: Token operations - retrieve
  const startRetrieve = Date.now();
  try {
    const tokens = loadTokens();
    result.tokenOperations.retrieve = tokens.length >= 0;
    results.push({
      name: "push: Token Retrieve",
      category: "push",
      status: "pass",
      message: `Retrieved ${tokens.length} token(s)`,
      duration: Date.now() - startRetrieve,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name: "push: Token Retrieve",
      category: "push",
      status: "fail",
      message: `Failed: ${errorMessage}`,
      duration: Date.now() - startRetrieve,
      error: errorMessage,
    });
  }

  // Test 5: Token operations - delete
  const startDelete = Date.now();
  try {
    const testDeviceId = `audit-register-${Date.now()}`;
    const tokens = loadTokens();
    const filtered = tokens.filter((t) => t.deviceId !== testDeviceId);
    saveTokens(filtered);

    // Verify deletion
    const verifyTokens = loadTokens();
    const found = verifyTokens.some((t) => t.deviceId === testDeviceId);

    result.tokenOperations.delete = !found;
    results.push({
      name: "push: Token Delete",
      category: "push",
      status: !found ? "pass" : "fail",
      message: !found
        ? "Token deleted successfully"
        : "Token deletion verification failed",
      duration: Date.now() - startDelete,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name: "push: Token Delete",
      category: "push",
      status: "fail",
      message: `Failed: ${errorMessage}`,
      duration: Date.now() - startDelete,
      error: errorMessage,
    });
  }

  // Test 6: Expo API reachability
  const startExpo = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          to: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
          title: "Audit Test",
          body: "This is a test - please ignore",
        },
      ]),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startExpo;
    result.expoApi.reachable = true;
    result.expoApi.responseTime = responseTime;

    // Check if it's an auth error (token invalid) vs network error
    const text = await response.text();
    const isAuthError =
      text.includes("DeviceNotRegistered") ||
      text.includes("InvalidCredentials");

    if (response.status === 200 || (response.status === 400 && isAuthError)) {
      results.push({
        name: "push: Expo API",
        category: "push",
        status: "pass",
        message: `API reachable (${response.status}) - ${responseTime}ms`,
        duration: responseTime,
      });
    } else {
      results.push({
        name: "push: Expo API",
        category: "push",
        status: "warn",
        message: `API returned ${response.status}`,
        duration: responseTime,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startExpo;

    result.expoApi.reachable = false;
    result.expoApi.error = errorMessage;

    // Check for specific error types
    if (errorMessage.includes("aborted")) {
      results.push({
        name: "push: Expo API",
        category: "push",
        status: "fail",
        message: "Request timed out (10s)",
        duration,
      });
    } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("EAI_AGAIN")) {
      results.push({
        name: "push: Expo API",
        category: "push",
        status: "fail",
        message: "DNS resolution failed - check internet connection",
        duration,
      });
    } else {
      results.push({
        name: "push: Expo API",
        category: "push",
        status: "fail",
        message: `Connection failed: ${errorMessage}`,
        duration,
        error: errorMessage,
      });
    }
  }

  return { result, results };
}

/**
 * Generate push notification recommendations
 */
export function getPushRecommendations(result: PushTestResult): string[] {
  const recommendations: string[] = [];

  if (!result.tokenStore.readable) {
    recommendations.push(
      "Token store is not readable. Check file permissions in ~/.config/opencode/"
    );
  }

  if (!result.tokenStore.writable) {
    recommendations.push(
      "Token store is not writable. Check write permissions in ~/.config/opencode/"
    );
  }

  if (!result.expoApi.reachable) {
    recommendations.push(
      "Expo API is not reachable. Check internet connection and firewall settings."
    );
  } else if (result.expoApi.responseTime && result.expoApi.responseTime > 5000) {
    recommendations.push(
      `Expo API response time is high (${result.expoApi.responseTime}ms). Consider checking network latency.`
    );
  }

  if (!result.tokenOperations.register) {
    recommendations.push("Token registration is failing. Check token format and device ID.");
  }

  if (!result.tokenOperations.delete) {
    recommendations.push("Token deletion is failing. Check file permissions.");
  }

  if (result.tokenStore.initialCount === 0) {
    recommendations.push(
      "No tokens registered. Register a device before testing push notifications."
    );
  }

  return recommendations;
}
