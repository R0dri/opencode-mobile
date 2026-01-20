/**
 * Report generator for audit results
 */

import * as fs from "fs";
import * as path from "path";
import type {
  AuditReport,
  TestResult,
  ServerInfo,
  EndpointTest,
  TunnelTestResult,
  PushTestResult,
} from "./types.js";

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Get status emoji
 */
function getStatusEmoji(
  status: "pass" | "fail" | "skip" | "warn"
): string {
  switch (status) {
    case "pass":
      return "✅";
    case "fail":
      return "❌";
    case "skip":
      return "⏭️";
    case "warn":
      return "⚠️";
  }
}

/**
 * Generate console report
 */
export function generateConsoleReport(report: AuditReport): string {
  const lines: string[] = [];

  // Header
  lines.push("=".repeat(60));
  lines.push("  OpenCode Mobile Plugin Audit");
  lines.push("=".repeat(60));
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push("");

  // Summary
  lines.push("📊 SUMMARY");
  lines.push("─".repeat(40));
  lines.push(`Tests Run:   ${report.summary.testsRun}`);
  lines.push(`✅ Passed:    ${report.summary.passed}`);
  lines.push(`❌ Failed:    ${report.summary.failed}`);
  lines.push(`⏭️ Skipped:    ${report.summary.skipped}`);
  lines.push(`⚠️ Warnings:   ${report.summary.warnings}`);
  lines.push(`Score:       ${report.summary.score.toFixed(1)}%`);
  lines.push("");

  // Server Info
  if (report.server) {
    lines.push("✅ SERVER");
    lines.push("─".repeat(40));
    const srv = report.server;
    lines.push(
      `  Port ${srv.port}:       ${srv.reachable ? "Reachable" : "Unreachable"}`
    );
    lines.push(
      `  Port ${srv.proxyPort}:   ${srv.reachable ? "Reachable" : "Unreachable"} (proxy)`
    );
    lines.push(`  CORS:          ${srv.corsConfigured ? "✅" : "❌"}`);
    lines.push("");
  }

  // Endpoints
  if (report.endpoints && report.endpoints.length > 0) {
    lines.push("✅ ENDPOINTS");
    lines.push("─".repeat(40));
    for (const ep of report.endpoints) {
      const statusIcon = ep.statusCode >= 200 && ep.statusCode < 300 ? "✅" : "❌";
      lines.push(
        `${statusIcon} ${ep.method.padEnd(6)} ${ep.path.padEnd(20)} ${ep.statusCode} (${formatDuration(ep.duration)})`
      );
    }
    lines.push("");
  }

  // Tunnels
  const tunnels = report.tunnels;
  const hasTunnels = tunnels?.ngrok || tunnels?.cloudflare || tunnels?.localtunnel;
  if (hasTunnels) {
    lines.push("🔶 TUNNEL PROVIDERS");
    lines.push("─".repeat(40));

    // Ngrok
    if (tunnels?.ngrok) {
      const ngrok = tunnels.ngrok;
      lines.push("ngrok:");
      lines.push(`   - Installed:   ${ngrok.installed ? `✅ (${ngrok.installedPath})` : "❌"}`);
      lines.push(`   - Configured:  ${ngrok.configured ? "✅" : "❌"}`);
      if (ngrok.connection) {
        lines.push(
          `   - Connection:  ${ngrok.connection.success ? `✅ ${ngrok.connection.url}` : `❌ ${ngrok.connection.error}`}`
        );
        lines.push(`   - Duration:    ${formatDuration(ngrok.connection.duration)}`);
      }
      lines.push("");
    }

    // Cloudflare
    if (tunnels?.cloudflare) {
      const cf = tunnels.cloudflare;
      lines.push("cloudflare:");
      lines.push(`   - Installed:   ${cf.installed ? `✅ (${cf.installedPath})` : "❌"}`);
      lines.push(`   - Configured:  ${cf.configured ? "✅" : "❌"}`);
      if (cf.connection) {
        lines.push(
          `   - Connection:  ${cf.connection.success ? `✅ ${cf.connection.url}` : `❌ ${cf.connection.error}`}`
        );
        lines.push(`   - Duration:    ${formatDuration(cf.connection.duration)}`);
      }
      lines.push("");
    }

    // Localtunnel
    if (tunnels?.localtunnel) {
      const lt = tunnels.localtunnel;
      lines.push("localtunnel:");
      lines.push(`   - Installed:   ${lt.installed ? "✅ (npm package)" : "❌"}`);
      lines.push(`   - Configured:  ${lt.configured ? "✅" : "❌"}`);
      if (lt.connection) {
        lines.push(
          `   - Connection:  ${lt.connection.success ? `✅ ${lt.connection.url}` : `❌ ${lt.connection.error}`}`
        );
        lines.push(`   - Duration:    ${formatDuration(lt.connection.duration)}`);
      }
      lines.push("");
    }
  }

  // Push Notifications
  if (report.push) {
    const push = report.push;
    lines.push("🔶 PUSH NOTIFICATIONS");
    lines.push("─".repeat(40));
    lines.push("Token Store:");
    lines.push(
      `   - Readable:  ${push.tokenStore.readable ? "✅" : "❌"}`
    );
    lines.push(
      `   - Writable:  ${push.tokenStore.writable ? "✅" : "❌"}`
    );
    lines.push(
      `   - Initial:   ${push.tokenStore.initialCount} token(s)`
    );
    lines.push("Expo API:");
    lines.push(
      `   - Reachable: ${push.expoApi.reachable ? "✅" : "❌"}`
    );
    if (push.expoApi.responseTime) {
      lines.push(`   - Latency:    ${formatDuration(push.expoApi.responseTime)}`);
    }
    if (push.expoApi.error) {
      lines.push(`   - Error:      ${push.expoApi.error}`);
    }
    lines.push("Token Operations:");
    lines.push(
      `   - Register:  ${push.tokenOperations.register ? "✅" : "❌"}`
    );
    lines.push(
      `   - Retrieve:  ${push.tokenOperations.retrieve ? "✅" : "❌"}`
    );
    lines.push(
      `   - Delete:    ${push.tokenOperations.delete ? "✅" : "❌"}`
    );
    lines.push("");
  }

  // Warnings
  const warnings = report.results.filter((r) => r.status === "warn");
  if (warnings.length > 0) {
    lines.push("⚠️ WARNINGS");
    lines.push("─".repeat(40));
    for (const w of warnings) {
      lines.push(`   - ${w.name}: ${w.message}`);
    }
    lines.push("");
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push("💡 RECOMMENDATIONS");
    lines.push("─".repeat(40));
    for (let i = 0; i < report.recommendations.length; i++) {
      lines.push(`   ${i + 1}. ${report.recommendations[i]}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("=".repeat(60));
  lines.push(`Audit completed in ${formatDuration(
    report.results.reduce((acc, r) => acc + (r.duration || 0), 0)
  )}`);
  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Generate JSON report
 */
export function generateJsonReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Save report to file
 */
export function saveReport(
  report: AuditReport,
  format: "console" | "json" = "console",
  outputPath?: string
): string {
  const content =
    format === "json"
      ? generateJsonReport(report)
      : generateConsoleReport(report);

  if (outputPath) {
    const fullPath = path.resolve(outputPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    return fullPath;
  }

  return content;
}

/**
 * Print report to console
 */
export function printReport(
  report: AuditReport,
  json: boolean = false
): void {
  if (json) {
    console.log(generateJsonReport(report));
  } else {
    console.log(generateConsoleReport(report));
  }
}

/**
 * Format individual test result for verbose output
 */
export function formatTestResult(result: TestResult): string {
  const emoji = getStatusEmoji(result.status);
  const lines = [`${emoji} ${result.name}`];
  if (result.message) {
    lines.push(`   ${result.message}`);
  }
  if (result.error) {
    lines.push(`   Error: ${result.error}`);
  }
  if (result.duration) {
    lines.push(`   Duration: ${formatDuration(result.duration)}`);
  }
  return lines.join("\n");
}
