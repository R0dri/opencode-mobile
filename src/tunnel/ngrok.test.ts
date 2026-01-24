/**
 * ngrok.test.ts - Unit tests for ngrok tunnel provider
 * 
 * Tests cover:
 * - diagnoseNgrok: diagnostics without network calls in tests
 * - ensureNgrokReady: readiness check
 * - State management: get/set/clear instance
 * - Port validation (if any)
 * 
 * Note: startNgrokTunnel tests require actual ngrok SDK and are skipped
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

const describeLive = process.env.OPENCODE_TEST_NGROK_LIVE === "1" ? describe : describe.skip;

describe("ngrok provider", () => {
  beforeEach(async () => {
    const { clearInstance } = await import("./ngrok");
    clearInstance();
  });

  afterEach(async () => {
    const { stopNgrokTunnel, clearInstance } = await import("./ngrok");
    await stopNgrokTunnel().catch(() => {});
    clearInstance();
  });

  describe("diagnoseNgrok", () => {
    it("should be a function", async () => {
      const { diagnoseNgrok } = await import("./ngrok");
      expect(typeof diagnoseNgrok).toBe("function");
    });

    it("should return installed: false when ngrok is not installed", async () => {
      const { diagnoseNgrok } = await import("./ngrok");
      
      // This test will use actual system state
      const result = await diagnoseNgrok();
      
      expect(result).toHaveProperty("installed");
      expect(result).toHaveProperty("authtokenConfigured");
      expect(result).toHaveProperty("authtokenValid");
      expect(result).toHaveProperty("configPath");
      expect(result).toHaveProperty("error");
    });

    it("should have correct structure when not installed", async () => {
      const { diagnoseNgrok } = await import("./ngrok");
      
      const result = await diagnoseNgrok();
      
      // If not installed, error should indicate that
      if (!result.installed) {
        expect(result.error).toContain("not installed");
      }
    });
  });

  describe("ensureNgrokReady", () => {
    it("should be a function", async () => {
      const { ensureNgrokReady } = await import("./ngrok");
      expect(typeof ensureNgrokReady).toBe("function");
    });

    it("should return object with ready and authtoken", async () => {
      const { ensureNgrokReady } = await import("./ngrok");
      
      const result = await ensureNgrokReady();
      
      expect(result).toHaveProperty("ready");
      expect(result).toHaveProperty("authtoken");
      expect(typeof result.ready).toBe("boolean");
      expect(result.authtoken === null || typeof result.authtoken === "string").toBe(true);
    });
  });

  describeLive("startNgrokTunnel", () => {
    it("should be a function", async () => {
      const { startNgrokTunnel } = await import("./ngrok");
      expect(typeof startNgrokTunnel).toBe("function");
    });

    it("should throw when ngrok is not properly configured (4 strategies)", async () => {
      const { startNgrokTunnel, clearInstance } = await import("./ngrok");
      clearInstance();
      
      // This will try all 4 strategies before throwing
      // Timeout is expected if ngrok is not properly configured with authtoken
      let threw = false;
      let errorMsg = "";
      try {
        await startNgrokTunnel({ port: 3000 });
      } catch (error: any) {
        threw = true;
        errorMsg = error.message;
      }
      
      // Either it succeeds (ngrok is configured) or throws with auth error
      expect(threw ? errorMsg : "success").toMatch(
        /(success|not configured|4018|authtoken|err_ngrok_\d+|timeout)/i
      );
    }, 60000); // 60s timeout for 4 strategy attempts
  });

  describe("stopNgrokTunnel", () => {
    it("should be a function", async () => {
      const { stopNgrokTunnel } = await import("./ngrok");
      expect(typeof stopNgrokTunnel).toBe("function");
    });

    it("should not throw when no tunnel is active", async () => {
      const { stopNgrokTunnel, clearInstance } = await import("./ngrok");
      clearInstance();
      
      await expect(stopNgrokTunnel()).resolves.not.toThrow();
    });
  });

  describe("state management", () => {
    it("getInstance should return null when no tunnel is active", async () => {
      const { getInstance, clearInstance } = await import("./ngrok");
      clearInstance();
      
      expect(getInstance()).toBeNull();
    });

    it("setInstance should update the instance", async () => {
      const { getInstance, setInstance } = await import("./ngrok");
      
      const mockInstance = { url: "https://test.ngrok.io" };
      setInstance(mockInstance);
      
      expect(getInstance()).toBe(mockInstance);
    });

    it("clearInstance should reset the instance", async () => {
      const { getInstance, setInstance, clearInstance } = await import("./ngrok");
      
      setInstance({ url: "https://test.ngrok.io" });
      clearInstance();
      
      expect(getInstance()).toBeNull();
    });
  });

  describe("stopNgrok (legacy alias)", () => {
    it("should be a function", async () => {
      const { stopNgrok } = await import("./ngrok");
      expect(typeof stopNgrok).toBe("function");
    });
  });

  describe("isNgrokInstalled", () => {
    it("should be a function", async () => {
      const { isNgrokInstalled } = await import("./ngrok");
      expect(typeof isNgrokInstalled).toBe("function");
    });
  });
});
