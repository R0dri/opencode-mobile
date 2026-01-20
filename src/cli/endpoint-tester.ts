/**
 * Endpoint tester for push-token and tunnel endpoints
 */

import type {
  AuditOptions,
  EndpointTest,
  TestResult,
} from "./types.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Test all endpoints
 */
export async function testEndpoints(
  port: number,
  options: AuditOptions
): Promise<{ tests: EndpointTest[]; results: TestResult[] }> {
  const baseUrl = `http://127.0.0.1:${port}`;
  const results: TestResult[] = [];
  const tests: EndpointTest[] = [];

  // Define all endpoint tests
  const endpointTests = [
    // Push-token endpoints
    {
      category: "endpoint" as const,
      name: "GET /push-token",
      method: "GET",
      path: "/push-token",
      expectedStatus: 200,
    },
    {
      category: "endpoint" as const,
      name: "POST /push-token",
      method: "POST",
      path: "/push-token",
      body: { token: "test-token-audit", platform: "ios", deviceId: `audit-test-${Date.now()}` },
      expectedStatus: 200,
    },
    {
      category: "endpoint" as const,
      name: "GET /push-token (after POST)",
      method: "GET",
      path: "/push-token",
      expectedStatus: 200,
    },
    {
      category: "endpoint" as const,
      name: "DELETE /push-token",
      method: "DELETE",
      path: "/push-token",
      body: { deviceId: `audit-test-${Date.now()}` },
      expectedStatus: 200,
    },
    // Tunnel endpoints
    {
      category: "endpoint" as const,
      name: "GET /tunnel (no tunnel)",
      method: "GET",
      path: "/tunnel",
      expectedStatus: 200,
    },
    {
      category: "endpoint" as const,
      name: "POST /tunnel",
      method: "POST",
      path: "/tunnel",
      body: { port },
      expectedStatus: 200,
      skipIf: options.tunnelOnly === false,
    },
    {
      category: "endpoint" as const,
      name: "GET /tunnel (with tunnel)",
      method: "GET",
      path: "/tunnel",
      expectedStatus: 200,
      skipIf: options.tunnelOnly === false,
    },
    {
      category: "endpoint" as const,
      name: "DELETE /tunnel",
      method: "DELETE",
      path: "/tunnel",
      expectedStatus: 200,
      skipIf: options.tunnelOnly === false,
    },
    // CORS preflight
    {
      category: "endpoint" as const,
      name: "OPTIONS /push-token",
      method: "OPTIONS",
      path: "/push-token",
      expectedStatus: 204,
    },
    {
      category: "endpoint" as const,
      name: "OPTIONS /tunnel",
      method: "OPTIONS",
      path: "/tunnel",
      expectedStatus: 204,
    },
    // Error cases
    {
      category: "endpoint" as const,
      name: "POST /push-token (missing fields)",
      method: "POST",
      path: "/push-token",
      body: { token: "test" },
      expectedStatus: 400,
    },
    {
      category: "endpoint" as const,
      name: "DELETE /push-token (missing deviceId)",
      method: "DELETE",
      path: "/push-token",
      body: {},
      expectedStatus: 400,
    },
    {
      category: "endpoint" as const,
      name: "POST /tunnel (invalid port)",
      method: "POST",
      path: "/tunnel",
      body: { port: "invalid" },
      expectedStatus: 400,
      skipIf: options.tunnelOnly === false,
    },
    // 404 cases
    {
      category: "endpoint" as const,
      name: "GET /nonexistent",
      method: "GET",
      path: "/nonexistent",
      expectedStatus: 404,
    },
  ];

  // Execute tests
  for (const test of endpointTests) {
    if (test.skipIf) {
      results.push({
        name: test.name,
        category: "endpoint",
        status: "skip",
        message: "Skipped by configuration",
      });
      continue;
    }

    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: {
          "Content-Type": "application/json",
          ...(test.method === "OPTIONS" ? {} : CORS),
        },
        body: test.body ? JSON.stringify(test.body) : undefined,
      });

      const duration = Date.now() - start;
      const success = response.status === test.expectedStatus;

      // Try to parse response body for details
      let responseBody: unknown;
      const textBody = await response.text();
      try {
        responseBody = JSON.parse(textBody);
      } catch {
        responseBody = textBody;
      }

      tests.push({
        method: test.method,
        path: test.path,
        statusCode: response.status,
        response: responseBody,
        duration,
      });

      results.push({
        name: test.name,
        category: "endpoint",
        status: success ? "pass" : "fail",
        message: success
          ? `${response.status} OK`
          : `Expected ${test.expectedStatus}, got ${response.status}`,
        details: {
          responseBody,
          duration: `${duration}ms`,
        },
        duration,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - start;

      tests.push({
        method: test.method,
        path: test.path,
        statusCode: 0,
        duration,
      });

      results.push({
        name: test.name,
        category: "endpoint",
        status: "fail",
        message: `Request failed: ${errorMessage}`,
        error: errorMessage,
        duration,
      });
    }
  }

  return { tests, results };
}

/**
 * Quick health check for endpoints
 */
export async function quickHealthCheck(
  port: number
): Promise<{ healthy: boolean; endpoints: string[] }> {
  const endpoints: string[] = [];
  const checks = [
    { method: "GET", path: "/push-token" },
    { method: "GET", path: "/tunnel" },
  ];

  for (const check of checks) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${check.path}`, {
        method: check.method,
      });
      if (response.status < 500) {
        endpoints.push(`${check.method} ${check.path}`);
      }
    } catch {
      // Endpoint not available
    }
  }

  return {
    healthy: endpoints.length === checks.length,
    endpoints,
  };
}
