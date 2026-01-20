/**
 * Audit utility types
 */

export interface AuditOptions {
  /** Connect to existing server instead of starting new one */
  connect?: string;
  /** Server port to use or connect to */
  port?: number;
  /** Proxy port (serverPort + 1) */
  proxyPort?: number;
  /** Only test tunnel providers */
  tunnelOnly?: boolean;
  /** Only test endpoints */
  endpointsOnly?: boolean;
  /** Only test push notifications */
  pushOnly?: boolean;
  /** Output as JSON */
  json?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Stop tunnels after testing */
  cleanup?: boolean;
  /** Timeout for tests in milliseconds */
  timeout?: number;
}

export interface TestResult {
  name: string;
  category: TestCategory;
  status: "pass" | "fail" | "skip" | "warn";
  message?: string;
  details?: Record<string, unknown>;
  duration?: number;
  error?: string;
}

export type TestCategory =
  | "server"
  | "endpoint"
  | "tunnel"
  | "push"
  | "infrastructure"
  | "proxy";

export interface ServerInfo {
  port: number;
  proxyPort: number;
  reachable: boolean;
  corsConfigured: boolean;
}

export interface EndpointTest {
  method: string;
  path: string;
  statusCode: number;
  response?: unknown;
  duration: number;
}

export interface TunnelTestResult {
  provider: "ngrok" | "cloudflare" | "localtunnel";
  installed: boolean;
  installedPath?: string;
  configured: boolean;
  connection?: {
    success: boolean;
    url?: string;
    tunnelId?: string;
    duration: number;
    error?: string;
  };
  diagnostics?: Record<string, unknown>;
}

export interface PushTestResult {
  tokenStore: {
    readable: boolean;
    writable: boolean;
    initialCount: number;
  };
  expoApi: {
    reachable: boolean;
    responseTime?: number;
    error?: string;
  };
  tokenOperations: {
    register: boolean;
    retrieve: boolean;
    delete: boolean;
  };
}

export interface AuditReport {
  timestamp: string;
  options: AuditOptions;
  summary: {
    testsRun: number;
    passed: number;
    failed: number;
    skipped: number;
    warnings: number;
    score: number;
  };
  server?: ServerInfo;
  endpoints?: EndpointTest[];
  tunnels?: {
    ngrok?: TunnelTestResult;
    cloudflare?: TunnelTestResult;
    localtunnel?: TunnelTestResult;
  };
  push?: PushTestResult;
  results: TestResult[];
  recommendations: string[];
}

export interface CliFlags {
  tunnelOnly: boolean;
  endpointsOnly: boolean;
  pushOnly: boolean;
  json: boolean;
  verbose: boolean;
  cleanup: boolean;
  connect?: string;
  port?: number;
}
