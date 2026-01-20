/**
 * localtunnel.test.ts - Unit tests for localtunnel provider
 * 
 * Tests cover:
 * - createLocaltunnel: factory function with dependency injection
 * - startLocaltunnel: legacy wrapper
 * - State management: getInstance, setInstance, clearInstance
 * - Port validation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("localtunnel provider", () => {
  beforeEach(async () => {
    // Clear state before each test
    const { clearInstance } = await import("./localtunnel");
    clearInstance();
  });

  afterEach(async () => {
    // Cleanup after each test
    const { stopLocaltunnel, clearInstance } = await import("./localtunnel");
    await stopLocaltunnel().catch(() => {});
    clearInstance();
  });

  describe("createLocaltunnel (factory)", () => {
    it("should accept valid port configuration", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      // This creates a real tunnel - in unit tests we would mock localtunnelModule
      const result = await createLocaltunnel({ port: 3000 });
      
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("tunnelId");
      expect(result).toHaveProperty("port", 3000);
      expect(result).toHaveProperty("provider", "localtunnel");
    });

    it("should throw error for invalid port (undefined)", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      await expect(createLocaltunnel({} as any)).rejects.toThrow("Invalid port");
    });

    it("should throw error for invalid port (string)", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      await expect(createLocaltunnel({ port: "3000" as any })).rejects.toThrow("Invalid port");
    });

    it("should throw error for invalid port (zero)", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      await expect(createLocaltunnel({ port: 0 })).rejects.toThrow("Invalid port");
    });

    it("should accept any port number (including negative)", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      // localtunnel accepts any port - it's just a number
      const result = await createLocaltunnel({ port: -1 });
      
      expect(result.port).toBe(-1);
    });

    it("should generate URL even without custom subdomain", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      const result = await createLocaltunnel({ port: 3000 });
      
      expect(result).toHaveProperty("url");
      expect(result.url).toMatch(/^https:\/\/.+\.loca\.lt$/);
    });

    it("should accept custom onUrl callback", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      let capturedUrl: string | null = null;
      const result = await createLocaltunnel(
        { port: 3000 },
        {
          onUrl: (url) => {
            capturedUrl = url;
          },
        }
      );
      
      expect(capturedUrl).toBe(result.url);
    });

    it("should accept mock localtunnel module", async () => {
      const { createLocaltunnel } = await import("./localtunnel");
      
      // Create a mock localtunnel that returns immediately
      const mockTunnel = {
        url: "https://mock-tunnel.example.com",
        close: () => {},
        on: () => {},
      };
      
      const mockModule = vi.fn((options, callback) => {
        // Simulate async callback
        setTimeout(() => callback(null, mockTunnel), 10);
        return mockTunnel;
      });
      
      const result = await createLocaltunnel(
        { port: 3000 },
        { localtunnelModule: mockModule as any }
      );
      
      expect(result.url).toBe("https://mock-tunnel.example.com");
      expect(mockModule).toHaveBeenCalled();
    });
  });

  describe("startLocaltunnel (legacy wrapper)", () => {
    it("should be a function", async () => {
      const { startLocaltunnel } = await import("./localtunnel");
      expect(typeof startLocaltunnel).toBe("function");
    });

    it("should create a tunnel", async () => {
      const { startLocaltunnel } = await import("./localtunnel");
      
      const result = await startLocaltunnel({ port: 3000 });
      
      expect(result.provider).toBe("localtunnel");
    });
  });

  describe("state management", () => {
    it("getInstance should return null when no tunnel is active", async () => {
      const { getInstance, clearInstance } = await import("./localtunnel");
      clearInstance();
      
      expect(getInstance()).toBeNull();
    });

    it("setInstance should update the instance", async () => {
      const { getInstance, setInstance } = await import("./localtunnel");
      
      const mockTunnel = { url: "https://test.example.com" };
      setInstance(mockTunnel);
      
      expect(getInstance()).toBe(mockTunnel);
    });

    it("clearInstance should reset the instance", async () => {
      const { getInstance, setInstance, clearInstance } = await import("./localtunnel");
      
      setInstance({ url: "https://test.example.com" });
      clearInstance();
      
      expect(getInstance()).toBeNull();
    });

    it("getLocaltunnelUrl should return null when no tunnel is active", async () => {
      const { getLocaltunnelUrl, clearInstance } = await import("./localtunnel");
      clearInstance();
      
      expect(getLocaltunnelUrl()).toBeNull();
    });

    it("getLocaltunnelUrl should return URL when tunnel is active", async () => {
      const { getLocaltunnelUrl, setInstance } = await import("./localtunnel");
      
      const mockTunnel = { url: "https://test.example.com" };
      setInstance(mockTunnel);
      
      expect(getLocaltunnelUrl()).toBe("https://test.example.com");
    });
  });

  describe("stopLocaltunnel", () => {
    it("should be a function", async () => {
      const { stopLocaltunnel } = await import("./localtunnel");
      expect(typeof stopLocaltunnel).toBe("function");
    });

    it("should not throw when no tunnel is active", async () => {
      const { stopLocaltunnel, clearInstance } = await import("./localtunnel");
      clearInstance();
      
      await expect(stopLocaltunnel()).resolves.not.toThrow();
    });
  });
});
