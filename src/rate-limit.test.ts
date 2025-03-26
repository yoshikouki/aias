import { describe, expect, it, vi } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("should allow requests within limit", async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });

    const result1 = await limiter.check("test");
    expect(result1.success).toBe(true);
    expect(result1.info.remaining).toBe(1);

    const result2 = await limiter.check("test");
    expect(result2.success).toBe(true);
    expect(result2.info.remaining).toBe(0);

    const result3 = await limiter.check("test");
    expect(result3.success).toBe(false);
    expect(result3.info.remaining).toBe(0);
  });

  it("should reset after window period", async () => {
    vi.useFakeTimers();

    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });

    const result1 = await limiter.check("test");
    expect(result1.success).toBe(true);
    expect(result1.info.remaining).toBe(1);

    const result2 = await limiter.check("test");
    expect(result2.success).toBe(true);
    expect(result2.info.remaining).toBe(0);

    // 1秒後
    vi.advanceTimersByTime(1000);

    const result3 = await limiter.check("test");
    expect(result3.success).toBe(true);
    expect(result3.info.remaining).toBe(1);

    vi.useRealTimers();
  });

  it("should handle multiple keys independently", async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });

    const result1 = await limiter.check("key1");
    expect(result1.success).toBe(true);
    expect(result1.info.remaining).toBe(1);

    const result2 = await limiter.check("key2");
    expect(result2.success).toBe(true);
    expect(result2.info.remaining).toBe(1);

    const result3 = await limiter.check("key1");
    expect(result3.success).toBe(true);
    expect(result3.info.remaining).toBe(0);

    const result4 = await limiter.check("key2");
    expect(result4.success).toBe(true);
    expect(result4.info.remaining).toBe(0);
  });

  it("should reset key", async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });

    const result1 = await limiter.check("test");
    expect(result1.success).toBe(true);
    expect(result1.info.remaining).toBe(1);

    limiter.reset("test");

    const result2 = await limiter.check("test");
    expect(result2.success).toBe(true);
    expect(result2.info.remaining).toBe(1);
  });

  describe("Configuration Validation", () => {
    it("should throw error for invalid maxRequests", () => {
      expect(() => new RateLimiter({ maxRequests: 0, windowMs: 1000 })).toThrow(
        "maxRequests must be positive",
      );
      expect(() => new RateLimiter({ maxRequests: -1, windowMs: 1000 })).toThrow(
        "maxRequests must be positive",
      );
    });

    it("should throw error for invalid windowMs", () => {
      expect(() => new RateLimiter({ maxRequests: 2, windowMs: 0 })).toThrow(
        "windowMs must be positive",
      );
      expect(() => new RateLimiter({ maxRequests: 2, windowMs: -1 })).toThrow(
        "windowMs must be positive",
      );
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle concurrent requests correctly", async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      const results = await Promise.all([
        limiter.check("test"),
        limiter.check("test"),
        limiter.check("test"),
      ]);

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(2);

      const remainingCounts = results.map((r) => r.info.remaining);
      expect(Math.min(...remainingCounts)).toBe(0);
    });
  });

  describe("Memory Management", () => {
    it("should clean up old timestamps", async () => {
      vi.useFakeTimers();

      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      // 最初のリクエスト
      const result1 = await limiter.check("test");
      expect(result1.success).toBe(true);

      // 2秒後
      vi.advanceTimersByTime(2000);

      // 新しいリクエスト
      const result2 = await limiter.check("test");
      expect(result2.success).toBe(true);
      expect(result2.info.remaining).toBe(1);

      vi.useRealTimers();
    });

    it("should handle multiple windows correctly", async () => {
      vi.useFakeTimers();

      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
      });

      // 最初のウィンドウ
      const result1 = await limiter.check("test");
      const result2 = await limiter.check("test");
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // 1秒後（新しいウィンドウ）
      vi.advanceTimersByTime(1000);

      // 新しいウィンドウでのリクエスト
      const result3 = await limiter.check("test");
      expect(result3.success).toBe(true);
      expect(result3.info.remaining).toBe(1);

      vi.useRealTimers();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small window", async () => {
      vi.useFakeTimers();

      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1, // 非常に小さいウィンドウ
      });

      const result1 = await limiter.check("test");
      expect(result1.success).toBe(true);

      // 1ミリ秒待つ
      vi.advanceTimersByTime(1);

      const result2 = await limiter.check("test");
      expect(result2.success).toBe(true);

      vi.useRealTimers();
    });

    it("should handle very large window", async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000000, // 非常に大きいウィンドウ
      });

      const result1 = await limiter.check("test");
      const result2 = await limiter.check("test");
      const result3 = await limiter.check("test");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(false);
    });
  });
});
