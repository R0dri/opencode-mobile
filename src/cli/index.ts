/**
 * CLI audit command - main entry point for npx audit
 */

import type { AuditOptions } from "./types.js";
import { runAudit } from "./test-runner.js";
import { printReport } from "./report.js";

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): AuditOptions {
  const options: AuditOptions = {
    port: 4096,
    proxyPort: 4097,
    timeout: 60000,
    cleanup: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2).toLowerCase();

      // Boolean flags
      if (["tunnel-only", "tunnelOnly"].includes(key)) {
        options.tunnelOnly = true;
      } else if (["endpoints-only", "endpointsOnly"].includes(key)) {
        options.endpointsOnly = true;
      } else if (["push-only", "pushOnly"].includes(key)) {
        options.pushOnly = true;
      } else if (["json"].includes(key)) {
        options.json = true;
      } else if (["verbose"].includes(key)) {
        options.verbose = true;
      } else if (["cleanup"].includes(key)) {
        options.cleanup = true;
      } else if (["no-cleanup"].includes(key)) {
        options.cleanup = false;
      } else if (["help", "h"].includes(key)) {
        return { ...options, help: true } as AuditOptions & { help: boolean };
      } else if (key === "port" && i + 1 < args.length) {
        i++;
        options.port = parseInt(args[i], 10);
      } else if (key === "connect" && i + 1 < args.length) {
        i++;
        options.connect = args[i];
      } else if (key === "timeout" && i + 1 < args.length) {
        i++;
        options.timeout = parseInt(args[i], 10);
      }
    } else if (arg.startsWith("-")) {
      const shortFlags = arg.slice(1).split("");
      for (const short of shortFlags) {
        switch (short) {
          case "t":
            options.tunnelOnly = true;
            break;
          case "e":
            options.endpointsOnly = true;
            break;
          case "p":
            options.pushOnly = true;
            break;
          case "j":
            options.json = true;
            break;
          case "v":
            options.verbose = true;
            break;
          case "c":
            options.cleanup = false;
            break;
          case "h":
            return { ...options, help: true } as AuditOptions & { help: boolean };
        }
      }
    }
  }

  return options;
}

/**
 * Show help message
 */
export function showHelp(): void {
  console.log(`
OpenCode Mobile Plugin - Endpoint Audit Utility

USAGE:
  npx opencode-mobile audit [OPTIONS]

OPTIONS:
  -t, --tunnel-only      Test only tunnel providers
  -e, --endpoints-only   Test only API endpoints
  -p, --push-only        Test only push notifications
  -j, --json             Output results as JSON
  -v, --verbose          Show detailed output
  -c, --no-cleanup       Don't stop servers/tunnels after testing
  --connect HOST:PORT    Connect to existing server instead of starting new
  --port PORT            Server port to use (default: 4096)
  --timeout MS           Request timeout in milliseconds (default: 60000)
  -h, --help             Show this help message

EXAMPLES:
  npx opencode-mobile audit              # Full audit
  npx opencode-mobile audit --tunnel-only # Test only tunnels
  npx opencode-mobile audit -j --verbose # JSON output with details
  npx opencode-mobile audit --connect localhost:4096 # Test existing server

OUTPUT:
  The audit tests:
  - Server health and CORS configuration
  - All API endpoints (push-token, tunnel)
  - Tunnel providers (ngrok, cloudflare, localtunnel)
  - Push notification system (token store, Expo API)

  Results include:
  - Pass/fail/skip status for each test
  - Response times and error messages
  - Recommendations for fixes
  - Overall health score
`);
}

/**
 * Main CLI entry point
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);

  if ((options as { help?: boolean }).help) {
    showHelp();
    return;
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("  OpenCode Mobile Plugin - Endpoint Audit");
  console.log("=".repeat(60));
  console.log("");

  try {
    const report = await runAudit(options);

    console.log("");
    console.log("=".repeat(60));
    console.log("  AUDIT RESULTS");
    console.log("=".repeat(60));
    console.log("");

    printReport(report, options.json || false);

    // Exit with error code if tests failed
    if (report.summary.failed > 0) {
      process.exit(1);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Audit failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Export for programmatic use
export { runAudit } from "./test-runner.js";
export { generateConsoleReport, generateJsonReport } from "./report.js";
export type { AuditOptions, AuditReport, TestResult } from "./types.js";
