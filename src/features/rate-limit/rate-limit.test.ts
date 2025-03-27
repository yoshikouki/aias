import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initRateLimiter, withRateLimit } from "./middleware";

describe("withRateLimit", () => {
  let currentTime = 0;

  beforeEach(() => {
    currentTime = 0;
    initRateLimiter(() => currentTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests within limit", async () => {
    const middleware = withRateLimit("test");
    const next = vi.fn().mockResolvedValue("success");

    const result = await middleware(next);
    expect(result).toBe("success");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should throw error when rate limit is exceeded", async () => {
    const middleware = withRateLimit("test");
    const next = vi.fn().mockResolvedValue("success");

    // 制限内のリクエスト
    for (let i = 0; i < 15; i++) {
      await middleware(next);
      currentTime += 100; // 各リクエストの間に100ms進める
    }

    // 制限超過のリクエスト
    try {
      await middleware(next);
      throw new Error("Expected middleware to throw an error");
    } catch (error) {
      expect(error).toMatchObject({
        type: "rate_limit",
        message: "Rate limit exceeded",
        info: {
          remaining: 0,
          limit: 15,
          reset: expect.any(Number),
        },
      });
    }
  });

  it("should handle multiple keys independently", async () => {
    const middleware1 = withRateLimit("key1");
    const middleware2 = withRateLimit("key2");
    const next = vi.fn().mockResolvedValue("success");

    // key1の制限を満たす
    for (let i = 0; i < 15; i++) {
      await middleware1(next);
      currentTime += 100; // 各リクエストの間に100ms進める
    }

    // key2はまだ制限に達していない
    const result = await middleware2(next);
    expect(result).toBe("success");
  });
});
