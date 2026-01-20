import http, { request as httpRequest } from "http";

export interface ProxyConfig {
  proxyPort: number;
  serverPort: number;
  tokenApiPort: number;
}

let serverStarted = false;
let server: http.Server | null = null;

export function startProxy(config: ProxyConfig): Promise<void> {
  // Validate config
  if (!config?.proxyPort || !config?.serverPort || !config?.tokenApiPort) {
    console.log("[Proxy] Invalid config received (re-init?), skipping");
    console.log("[Proxy] startProxy called from:", new Error().stack?.split('\n').slice(2, 6).join('\n'));
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (serverStarted) {
      console.log("[Proxy] Proxy already running");
      resolve();
      return;
    }

    server = http.createServer((clientReq, clientRes) => {
      const url = clientReq.url || "";

      const targetPort = url.startsWith("/push-token")
        ? config.tokenApiPort
        : config.serverPort;

      const options = {
        hostname: "127.0.0.1",
        port: targetPort,
        path: url,
        method: clientReq.method,
        headers: {
          ...clientReq.headers,
          "x-forwarded-for": clientReq.socket.remoteAddress,
          "x-forwarded-host": clientReq.headers.host,
        },
      };

      const proxyReq = httpRequest(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

        // Clean up listeners when done
        const cleanup = () => {
          proxyRes.removeListener("data", onData);
          proxyRes.removeListener("end", onEnd);
          proxyRes.removeListener("error", onError);
        };

        const onData = (chunk: Buffer) => {
          clientRes.write(chunk);
        };

        const onEnd = () => {
          cleanup();
          clientRes.end();
        };

        const onError = (err: Error) => {
          cleanup();
          if (!clientRes.headersSent) {
            clientRes.writeHead(502, { "Content-Type": "text/plain" });
            clientRes.end("Proxy error");
          }
        };

        proxyRes.on("data", onData);
        proxyRes.on("end", onEnd);
        proxyRes.on("error", onError);

        // Clean up if client disconnects
        clientRes.on("close", cleanup);
      });

      proxyReq.on("error", (err: any) => {
        console.error("[Proxy] Error forwarding request:", err.message);
        if (!clientRes.headersSent) {
          clientRes.writeHead(502, { "Content-Type": "text/plain" });
          clientRes.end("Bad Gateway");
        }
      });

      clientReq.pipe(proxyReq);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.log("[Proxy] Port already in use - proxy likely already running");
        serverStarted = true;
        resolve();
      } else {
        console.error("[Proxy] Failed to start:", err.message);
        reject(err);
      }
    });

    server.listen(config.proxyPort, () => {
      serverStarted = true;
      console.log(`[Proxy] Running on port ${config.proxyPort}`);
      console.log(`[Proxy] /push-token/* → Port ${config.tokenApiPort}`);
      console.log(`[Proxy] /* → Port ${config.serverPort}`);
      resolve();
    });
  });
}

export function stopProxy(): void {
  if (server) {
    server.close(() => {
      console.log("[Proxy] Server stopped");
    });
    server = null;
    serverStarted = false;
  }
}

export function isProxyRunning(): boolean {
  return serverStarted;
}
