/**
 * Test runner engine - orchestrates all audit tests
 */

import type {
  AuditOptions,
  AuditReport,
  TestResult,
  TestCategory,
} from "./types.js";
import { startServer, stopServer, getServerInfo } from "./server-manager.js";
import { testEndpoints } from "./endpoint-tester.js";
import { testTunnelProviders, compareTunnelProviders } from "./tunnel-tester.js";
import { testPush, getPushRecommendations } from "./push-tester.js";

/**
 * Run all audit tests
 */
export async function runAudit(options: AuditOptions): Promise<AuditReport> {
  const startTime = Date.now();
  const allResults: TestResult[] = [];
  const recommendations: string[] = [];

  console.log("[Audit] Starting comprehensive endpoint audit...");

  // Determine which tests to run
  const runServer = !options.connect;
  const runEndpoints = !options.tunnelOnly;
  const runTunnels = !options.endpointsOnly && !options.pushOnly;
  const runPush = !options.endpointsOnly && !options.tunnelOnly;

  let serverPort = options.port || 4096;

  // Start server if needed
  if (runServer && !options.connect) {
    console.log("[Audit] Starting server...");
    try {
      const { port } = await startServer(options);
      serverPort = port;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Audit] Failed to start server: ${errorMessage}`);
      return createFailedReport(options, errorMessage, allResults);
    }
  } else if (options.connect) {
    // Parse connection string
    const [host, port] = options.connect.split(":");
    serverPort = parseInt(port || "4096", 10);
    console.log(`[Audit] Connecting to existing server at ${options.connect}`);
  }

  // Wait a moment for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Run server health check
  let serverInfo;
  try {
    serverInfo = await getServerInfo(serverPort);
    if (!serverInfo.reachable) {
      allResults.push({
        name: "Server: Reachable",
        category: "server",
        status: "fail",
        message: `Server on port ${serverPort} is not responding`,
      });
    } else {
      allResults.push({
        name: "Server: Reachable",
        category: "server",
        status: "pass",
        message: `Server responding on port ${serverPort}`,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    serverInfo = {
      port: serverPort,
      proxyPort: serverPort + 1,
      reachable: false,
      corsConfigured: false,
    };
    allResults.push({
      name: "Server: Reachable",
      category: "server",
      status: "fail",
      message: `Health check failed: ${errorMessage}`,
      error: errorMessage,
    });
  }

  // Run endpoint tests
  let endpointTestsResult;
  if (runEndpoints) {
    console.log("[Audit] Testing endpoints...");
    endpointTestsResult = await testEndpoints(serverPort, options);
    allResults.push(...endpointTestsResult.results);
  }

  // Run tunnel tests
  let tunnelResults;
  if (runTunnels) {
    console.log("[Audit] Testing tunnel providers...");
    tunnelResults = await testTunnelProviders(serverPort, options);
    allResults.push(...tunnelResults.results);

    // Add tunnel provider recommendations
    const tunnelRecs = compareTunnelProviders(tunnelResults);
    recommendations.push(...tunnelRecs);
  }

  // Run push tests
  let pushResults;
  if (runPush) {
    console.log("[Audit] Testing push notifications...");
    pushResults = await testPush(options);
    allResults.push(...pushResults.results);

    // Add push recommendations
    const pushRecs = getPushRecommendations(pushResults.result);
    recommendations.push(...pushRecs);
  }

  // Stop server if we started it
  if (runServer && options.connect === undefined && options.cleanup !== false) {
    console.log("[Audit] Cleaning up...");
    await stopServer();
  }

  // Calculate summary
  const summary = calculateSummary(allResults);

  // Build report
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    options,
    summary,
    server: serverInfo,
    endpoints: endpointTestsResult?.tests,
    tunnels: tunnelResults
      ? {
          ngrok: tunnelResults.ngrok,
          cloudflare: tunnelResults.cloudflare,
          localtunnel: tunnelResults.localtunnel,
        }
      : undefined,
    push: pushResults?.result,
    results: allResults,
    recommendations,
  };

  const totalDuration = Date.now() - startTime;
  console.log(`[Audit] Audit completed in ${(totalDuration / 1000).toFixed(2)}s`);

  return report;
}

/**
 * Calculate test summary
 */
function calculateSummary(results: TestResult[]): {
  testsRun: number;
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
  score: number;
} {
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  const testsRun = passed + failed + warnings; // Skipped don't count as run

  const score = testsRun > 0 ? (passed / testsRun) * 100 : 0;

  return {
    testsRun,
    passed,
    failed,
    skipped,
    warnings,
    score,
  };
}

/**
 * Create a failed report when audit can't complete
 */
function createFailedReport(
  options: AuditOptions,
  error: string,
  results: TestResult[]
): AuditReport {
  return {
    timestamp: new Date().toISOString(),
    options,
    summary: {
      testsRun: 0,
      passed: 0,
      failed: 1,
      skipped: 0,
      warnings: 0,
      score: 0,
    },
    results: [
      ...results,
      {
        name: "Audit: Initialization",
        category: "infrastructure",
        status: "fail",
        message: `Audit failed to initialize: ${error}`,
        error,
      },
    ],
    recommendations: [
      "Check that the server can be started or an existing server is reachable",
      "Verify all dependencies are installed",
    ],
  };
}

/**
 * Run specific test category
 */
export async function runCategoryTest(
  category: TestCategory,
  port: number,
  options: AuditOptions
): Promise<{ results: TestResult[]; report?: unknown }> {
  switch (category) {
    case "endpoint":
      return { results: (await testEndpoints(port, options)).results };
    case "tunnel":
      return { results: (await testTunnelProviders(port, options)).results };
    case "push":
      return { results: (await testPush(options)).results };
    default:
      return { results: [] };
  }
}
