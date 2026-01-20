/**
 * cloudflare.test.ts - Unit tests for cloudflare tunnel provider
 * 
 * Tests cover:
 * - findCloudflared: binary discovery
 * - createCloudflareTunnel: factory function with dependency injection
 * - startCloudflareTunnel: legacy wrapper
 * - State management: getProcess, setProcess, clearState, setUrl
 * - Port validation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn, ChildProcess } from "child_process";

describe("cloudflare provider", () => {
  beforeEach(async () => {
    const { clearState } = await import("./cloudflare");
    clearState();
  });

  afterEach(async () => {
    const { stopCloudflareTunnel, clearState } = await import("./cloudflare");
    await stopCloudflareTunnel().catch(() => {});
    clearState();
  });

  describe("findCloudflared", () => {
    it("should return null when cloudflared is not found", async () => {
      const { findCloudflared } = await import("./cloudflare");
      
      const result = findCloudflared(
        ["/nonexistent/path"],
        () => false
      );
      
      expect(result).toBeNull();
    });

    it("should return path when cloudflared exists", async () => {
      const { findCloudflared } = await import("./cloudflare");
      
      const result = findCloudflared(
        ["/usr/local/bin/cloudflared"],
        (p) => p === "/usr/local/bin/cloudflared"
      );
      
      expect(result).toBe("/usr/local/bin/cloudflared");
    });

    it("should check multiple paths in order", async () => {
      const { findCloudflared } = await import("./cloudflare");
      
      const result = findCloudflared(
        ["/nonexistent1", "/usr/local/bin/cloudflared", "/nonexistent2"],
        (p) => p === "/usr/local/bin/cloudflared"
      );
      
      expect(result).toBe("/usr/local/bin/cloudflared");
    });

    it("should return first match when multiple paths exist", async () => {
      const { findCloudflared } = await import("./cloudflare");
      
      const result = findCloudflared(
        ["/path1", "/path2"],
        (p) => true
      );
      
      expect(result).toBe("/path1");
    });
  });

  describe("createCloudflareTunnel (factory)", () => {
    it("should throw error for invalid port (undefined)", async () => {
      const { createCloudflareTunnel } = await import("./cloudflare");
      
      await expect(createCloudflareTunnel({} as any)).rejects.toThrow("Invalid port");
    });

    it("should throw error for invalid port (string)", async () => {
      const { createCloudflareTunnel } = await import("./cloudflare");
      
      await expect(createCloudflareTunnel({ port: "3000" as any })).rejects.toThrow("Invalid port");
    });

    it("should throw error for invalid port (zero)", async () => {
      const { createCloudflareTunnel } = await import("./cloudflare");
      
      await expect(createCloudflareTunnel({ port: 0 })).rejects.toThrow("Invalid port");
    });

    it("should throw error when cloudflared not found", async () => {
      const { createCloudflareTunnel } = await import("./cloudflare");
      
      await expect(
        createCloudflareTunnel(
          { port: 3000 },
          undefined, // spawn
          () => false // existsSync - cloudflared not found
        )
      ).rejects.toThrow("cloudflared not found");
    });

    it("should accept mock spawn function", async () => {
      const { createCloudflareTunnel, setUrl } = await import("./cloudflare");
      
      setUrl(null); // Clear any existing state
      
      const mockProcess = {
        stdout: { on: (event: string, callback: (data: Buffer) => void) => {
          if (event === "data") {
            // Simulate URL output
            setTimeout(() => callback(Buffer.from("https://mock.trycloudflare.com")), 10);
          }
        }},
        stderr: { on: () => {} },
        on: (event: string, callback: (code: number | null) => void) => {
          if (event === "exit") {
            setTimeout(() => callback(0), 20);
          }
        },
        kill: () => {},
      } as unknown as ChildProcess;
      
      const mockSpawn = vi.fn(() => mockProcess);
      
      const result = await createCloudflareTunnel(
        { port: 3000 },
        mockSpawn,
        () => true // cloudflared exists
      );
      
      expect(result.provider).toBe("cloudflare");
      expect(result.url).toContain("trycloudflare.com");
    });

    it("should accept custom onUrl callback", async () => {
      const { createCloudflareTunnel, setUrl } = await import("./cloudflare");
      
      setUrl(null);
      
      let capturedUrl: string | null = null;
      
      const mockProcess = {
        stdout: { on: (event: string, callback: (data: Buffer) => void) => {
          if (event === "data") {
            setTimeout(() => callback(Buffer.from("https://callback-test.trycloudflare.com")), 10);
          }
        }},
        stderr: { on: () => {} },
        on: (event: string, callback: (code: number | null) => void) => {
          if (event === "exit") {
            setTimeout(() => callback(0), 20);
          }
        },
        kill: () => {},
      } as unknown as ChildProcess;
      
      const mockSpawn = vi.fn(() => mockProcess);
      
      const result = await createCloudflareTunnel(
        { port: 3000 },
        mockSpawn,
        () => true,
        (url) => {
          capturedUrl = url;
        }
      );
      
      expect(capturedUrl).toBe(result.url);
    });
  });

  describe("startCloudflareTunnel (legacy wrapper)", () => {
    it("should be a function", async () => {
      const { startCloudflareTunnel } = await import("./cloudflare");
      expect(typeof startCloudflareTunnel).toBe("function");
    });
  });

  describe("state management", () => {
    it("getProcess should return null when no process is active", async () => {
      const { getProcess, clearState } = await import("./cloudflare");
      clearState();
      
      expect(getProcess()).toBeNull();
    });

    it("setProcess should update the process", async () => {
      const { getProcess, setProcess } = await import("./cloudflare");
      
      const mockProcess = {} as ChildProcess;
      setProcess(mockProcess);
      
      expect(getProcess()).toBe(mockProcess);
    });

    it("setUrl should update the URL", async () => {
      const { getCloudflareUrl, setUrl } = await import("./cloudflare");
      
      setUrl("https://test.example.com");
      
      expect(getCloudflareUrl()).toBe("https://test.example.com");
    });

    it("clearState should reset process and URL", async () => {
      const { getProcess, getCloudflareUrl, setProcess, setUrl, clearState } = await import("./cloudflare");
      
      setProcess({} as ChildProcess);
      setUrl("https://test.example.com");
      clearState();
      
      expect(getProcess()).toBeNull();
      expect(getCloudflareUrl()).toBeNull();
    });

    it("getCloudflareUrl should return null when no tunnel is active", async () => {
      const { getCloudflareUrl, clearState } = await import("./cloudflare");
      clearState();
      
      expect(getCloudflareUrl()).toBeNull();
    });
  });

  describe("stopCloudflareTunnel", () => {
    it("should be a function", async () => {
      const { stopCloudflareTunnel } = await import("./cloudflare");
      expect(typeof stopCloudflareTunnel).toBe("function");
    });

    it("should not throw when no tunnel is active", async () => {
      const { stopCloudflareTunnel, clearState } = await import("./cloudflare");
      clearState();
      
      await expect(stopCloudflareTunnel()).resolves.not.toThrow();
    });
  });

  describe("isCloudflareInstalled", () => {
    it("should be a function", async () => {
      const { isCloudflareInstalled } = await import("./cloudflare");
      expect(typeof isCloudflareInstalled).toBe("function");
    });
  });
});
